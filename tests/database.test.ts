import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('migraciones, permisos y sincronización idempotente en PostgreSQL embebido', async t => {
  const database = new PGlite();
  try {
    await database.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
    `);
    for (const migration of ['202610160001_inventory.sql', '202610160002_offline_sync.sql']) {
      await database.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), 'utf8'));
    }
    const alice = '10000000-0000-0000-0000-000000000001';
    const bob = '10000000-0000-0000-0000-000000000002';
    const inactive = '10000000-0000-0000-0000-000000000003';
    const product = '20000000-0000-0000-0000-000000000001';
    const operation = '30000000-0000-0000-0000-000000000001';
    await database.exec(`insert into auth.users(id) values ('${alice}'), ('${bob}'), ('${inactive}');
      update public.profiles set is_active = true where id in ('${alice}', '${bob}');
      insert into public.products(id,name,quantity,price) values ('${product}','Producto de prueba',5,1.25);`);
    const asUser = async (id: string, sql: string) => {
      return database.transaction(async tx => {
        await tx.exec('set local role authenticated');
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
        return tx.query(sql);
      });
    };

    await t.test('perfil de Auth y acceso compartido solo para miembros activos', async () => {
      assert.equal((await asUser(alice, 'select * from public.products')).rows.length, 1);
      assert.equal((await asUser(bob, 'select * from public.products')).rows.length, 1);
      assert.equal((await asUser(inactive, 'select * from public.products')).rows.length, 0);
      await assert.rejects(asUser(inactive, 'update public.profiles set is_active = true'));
      await assert.rejects(database.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select * from public.products'); }));
    });
    const rpc = `select * from public.sync_deduction('${operation}', '${product}', 2, '2026-10-16T12:00:00Z')`;
    await t.test('un ID repetido devuelve el mismo recibo y descuenta una sola vez', async () => {
      const first = await asUser(alice, rpc);
      const retry = await asUser(alice, rpc);
      assert.deepEqual(first.rows, retry.rows);
      const result = await database.query<{ quantity: number }>('select quantity from public.products');
      assert.equal(result.rows[0].quantity, 3);
      assert.equal((await database.query('select * from public.stock_deductions')).rows.length, 1);
      await assert.rejects(asUser(bob, rpc));
    });
    await t.test('stock insuficiente y entradas inválidas no modifican cantidades ni historial', async () => {
      for (const units of [0, -1, 4]) await assert.rejects(asUser(alice,
        `select * from public.sync_deduction(gen_random_uuid(), '${product}', ${units}, now())`));
      assert.equal((await database.query<{ quantity: number }>('select quantity from public.products')).rows[0].quantity, 3);
      assert.equal((await database.query('select * from public.stock_deductions')).rows.length, 1);
    });
    await t.test('cliente no puede alterar stock, borrar productos ni fabricar movimientos', async () => {
      await assert.rejects(asUser(alice, 'update public.products set quantity = 100'));
      await assert.rejects(asUser(alice, 'delete from public.products'));
      await assert.rejects(asUser(alice, 'delete from public.stock_deductions'));
      await assert.rejects(asUser(alice, `insert into public.stock_deductions(product_id,product_name,units,quantity_before,quantity_after) values ('${product}','Falso',1,3,2)`));
    });
    await t.test('un miembro activo puede dar de alta productos con los mismos campos que envía la API', async () => {
      await database.transaction(async tx => {
        await tx.exec('set local role authenticated');
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [alice]);
        const result = await tx.query<{ created_by: string; description: string; photo_path: string | null }>(`
          with pgrst_source as (
            insert into public.products (name, description, quantity, price, photo_path)
            values ('Alta de prueba', '', 2, 1.25, null) returning *
          ) select * from pgrst_source
        `);
        assert.equal(result.rows[0].created_by, alice);
        assert.equal(result.rows[0].description, '');
        assert.equal(result.rows[0].photo_path, null);
      });
    });
    await t.test('la reparación recupera altas con permisos o DEFAULT ausentes sin permitir modificar stock', async () => {
      const insert = `insert into public.products (name, description, quantity, price, photo_path)
        values ('Permisos reparados', '', 1, 2.50, null) returning *`;
      await database.exec(`revoke insert (name, description, photo_path, quantity, price)
        on public.products from authenticated;
        alter table public.products alter column created_by drop default;`);
      await assert.rejects(asUser(alice, insert), (error: unknown) => (error as { code: string }).code === '42501');
      const repair = await readFile(new URL('../supabase/migrations/202610160003_product_insert_permissions.sql', import.meta.url), 'utf8');
      await database.exec(repair);
      const result = await asUser(alice, insert);
      assert.equal((result.rows[0] as { created_by: string }).created_by, alice);
      await assert.rejects(asUser(inactive, insert));
      await assert.rejects(asUser(alice, `insert into public.products (name, quantity, price, created_by)
        values ('Autor falso', 1, 2.50, '${bob}')`));
      await assert.rejects(asUser(alice, 'update public.products set quantity = 100'));
      await assert.rejects(asUser(alice, 'delete from public.stock_deductions'));
      // Es seguro volver a ejecutar la reparación.
      await database.exec(repair);
    });
    await t.test('la reparación restablece perfiles, historial, edición, RPC y fotos manteniendo las restricciones', async () => {
      await database.exec(`
        revoke select on public.profiles, public.stock_deductions from authenticated;
        revoke update (name, description, photo_path, price, is_archived) on public.products from authenticated;
        revoke execute on function public.sync_deduction(uuid, uuid, integer, timestamptz) from authenticated;
        revoke all on storage.objects from authenticated;
        drop policy profiles_read on public.profiles;
        drop policy deductions_read on public.stock_deductions;
        drop policy products_update on public.products;
        drop policy product_photos_insert on storage.objects;
      `);
      await assert.rejects(asUser(alice, 'select * from public.profiles'));
      await assert.rejects(asUser(alice, rpc));
      const repair = await readFile(new URL('../supabase/migrations/202610160003_product_insert_permissions.sql', import.meta.url), 'utf8');
      await database.exec(repair);
      assert.equal((await asUser(alice, 'select * from public.profiles')).rows.length, 3);
      assert.equal((await asUser(inactive, 'select * from public.profiles')).rows.length, 1);
      assert.ok((await asUser(alice, 'select * from public.stock_deductions')).rows.length > 0);
      assert.equal((await asUser(inactive, 'select * from public.stock_deductions')).rows.length, 0);
      assert.equal((await asUser(alice, rpc)).rows.length, 1);
      await asUser(alice, `update public.products set name = 'Nombre actualizado' where id = '${product}'`);
      await assert.rejects(asUser(alice, 'update public.products set quantity = 100'));
      await assert.rejects(asUser(alice, 'update public.profiles set is_active = true'));
      await assert.rejects(asUser(alice, 'delete from public.stock_deductions'));
      await asUser(alice, `insert into storage.objects (bucket_id, name) values ('product-photos', 'test.webp') returning *`);
      assert.equal((await asUser(bob, "select * from storage.objects where name = 'test.webp'")).rows.length, 1);
      assert.equal((await asUser(inactive, 'select * from storage.objects')).rows.length, 0);
      await assert.rejects(asUser(inactive, `insert into storage.objects (bucket_id, name) values ('product-photos', 'blocked.webp')`));
      await assert.rejects(asUser(alice, `insert into storage.objects (bucket_id, name) values ('other-bucket', 'blocked.webp')`));
      await asUser(alice, `update storage.objects set name = 'renamed.webp' where name = 'test.webp'`);
      await asUser(alice, `delete from storage.objects where name = 'renamed.webp'`);
      assert.equal((await asUser(alice, 'select * from storage.objects')).rows.length, 0);
    });
  } finally { await database.close(); }
});

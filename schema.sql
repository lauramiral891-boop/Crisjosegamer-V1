create table if not exists users(
  id text primary key, email text unique, username text unique, name text, company text,
  pass text not null, role text not null, house text not null, code text unique, created bigint,
  verified boolean default false
);
create table if not exists pending_verifications(
  email text primary key, code text not null, expires bigint not null, payload jsonb not null
);
alter table users add column if not exists username text;
alter table users add column if not exists verified boolean default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='users_username_key') then
    alter table users add constraint users_username_key unique(username);
  end if;
end $$;
update users set verified=true where verified is null;
create table if not exists records(
  house text not null, kind text not null, id text not null,
  data jsonb, srv bigint not null, deleted boolean default false,
  primary key(house,kind,id)
);
create index if not exists records_srv on records(srv);
create table if not exists push_subs(
  endpoint text primary key, house text not null, p256dh text not null, auth text not null
);

create table if not exists users(
  id text primary key, email text unique, name text, company text,
  pass text not null, role text not null, house text not null, code text unique, created bigint
);
create table if not exists records(
  house text not null, kind text not null, id text not null,
  data jsonb, srv bigint not null, deleted boolean default false,
  primary key(house,kind,id)
);
create index if not exists records_srv on records(srv);

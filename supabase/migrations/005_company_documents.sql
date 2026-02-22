-- Company documents table
-- Stores metadata for files uploaded to S3 (proposals, contracts, pitch decks).

create table if not exists company_documents (
  id bigint generated always as identity primary key,
  company_id int not null,
  uploaded_by uuid not null references auth.users(id),
  file_name text not null,
  file_size bigint default 0,
  file_type text default 'application/octet-stream',
  s3_key text not null,
  notes text default '',
  created_at timestamptz default now()
);

create index if not exists idx_company_documents_company_id
  on company_documents(company_id);

create index if not exists idx_company_documents_uploaded_by
  on company_documents(uploaded_by);

-- RLS: users can see all documents, but only delete their own uploads
alter table company_documents enable row level security;

create policy "Authenticated users can read documents"
  on company_documents for select
  to authenticated
  using (true);

create policy "Users can insert documents"
  on company_documents for insert
  to authenticated
  with check (auth.uid() = uploaded_by);

create policy "Users can delete their own documents"
  on company_documents for delete
  to authenticated
  using (auth.uid() = uploaded_by);

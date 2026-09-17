# Supabase deployment

GarageHub uses Supabase for PostgreSQL and private document storage. The React app and ASP.NET Core API are built into one container because Supabase does not host ASP.NET Core applications.

## 1. Create Supabase environments

Create separate Supabase projects for testing and production. In each project:

1. Open **Storage** and create a private bucket named `garage-documents`.
2. Open **Connect** and copy the **Session pooler** connection string on port `5432`. This works from IPv4 container hosts and supports persistent EF Core connections.
3. Keep the database password and service-role key in the application host's secret manager. Never add them to Git or expose them through a `VITE_` variable.

The API accesses Storage using the service role and performs authorization itself. Do not make the bucket public.

## 2. Configure the application host

Deploy the root `Dockerfile` to Azure Container Apps, Azure App Service, Render, Fly.io, or another container platform. Configure these environment variables:

```text
ConnectionStrings__GarageHub=Host=<pooler-host>;Port=5432;Database=postgres;Username=postgres.<project-ref>;Password=<password>;SSL Mode=Require
Jwt__Key=<at-least-32-random-characters>
AllowedOrigins__0=https://<application-domain>
Database__ApplyMigrations=true
Seed__DemoData=false
Storage__Provider=Supabase
Supabase__Url=https://<project-ref>.supabase.co
Supabase__ServiceRoleKey=<service-role-key>
Supabase__StorageBucket=garage-documents
Bootstrap__OrganizationName=<testing-organization-name>
Bootstrap__OwnerEmail=<first-owner-email>
Bootstrap__OwnerPassword=<strong-first-owner-password>
```

The container listens on port `8080`. The frontend calls `/api` on the same origin, so no public database credentials are needed in the browser.

On the first startup, EF Core applies the migrations and creates only the configured owner when the database is empty. After the first owner exists, remove the three `Bootstrap__*` secrets from the host. Demo users, customers, vehicles, jobs, and inventory are disabled in production.

## 3. Enter testing data

1. Sign in using the bootstrap owner.
2. Create staff accounts through **Staff & Access** (or `POST /api/users`). Passwords must contain at least 12 characters.
3. Use the application intake screens to enter customers and jobs. Main portal state is stored in the organization-scoped `PortalSnapshots` table and synchronized between authenticated sessions.
4. Capture intake and job photos with the device camera/gallery, or use the authenticated document endpoint for PDFs and images. Files are placed in the private Supabase bucket; the gallery resolves fresh one-hour signed download URLs.

Legacy `garagehub-store` browser data is deleted on login and is never uploaded. This prevents old sample records from becoming testing data.

## 4. Verify deployment

Run these checks against the deployed host:

```bash
curl -i https://<application-domain>/api/health
curl -i https://<application-domain>/swagger/index.html
```

Then verify:

- The bootstrap owner can sign in.
- A second staff account can sign in.
- Data entered by one role appears for another role in the same organization.
- A stale portal-state update returns HTTP `409`.
- A document uploads to the private bucket and its signed URL expires.
- No demo records appear in PostgreSQL.

## 5. Operational requirements

- Use Supabase backups and enable point-in-time recovery for production if the selected plan supports it.
- Rotate the database password, JWT key, and service-role key periodically.
- Restrict Swagger in production before public launch.
- Apply future EF migrations during a controlled deployment rather than allowing multiple replicas to migrate simultaneously.
- Replace the local notification delivery adapter before enabling real SMS, WhatsApp, or email delivery.

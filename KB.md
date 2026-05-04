# NESW Portal — Project Knowledge Base

## Critical Rules

### 🚫 Never Delete Production Data

**Rule:** Never delete, truncate, clear, or wipe any database table or records in a production environment under any circumstances — without explicit written approval from the project owner first.

**Applies to:** ALL projects (NESW Portal, Palo Alto, DMS, and any future project).

**Background:** On 2026-05-05, a diagnostic cleanup script was run against `nesw-properties-production` which destroyed 2 real property listings submitted by a live user. The data was unrecoverable.

**What is allowed without approval:**
- Reading / scanning production data for diagnostics
- Deploying new code to production
- Adding new records to production

**What requires explicit written approval before executing:**
- Any DELETE, truncate, or bulk-remove operation on production tables
- Disabling or dropping production infrastructure
- Any irreversible change to production data

---

## Environments

| Environment | Branch | URL | AWS Stage |
|---|---|---|---|
| Staging | `main` | `staging-portal.neswcorp.com` | `staging` |
| Production | `production` | `portal.neswcorp.com` | `production` |

## AWS Resources

| Resource | Staging | Production |
|---|---|---|
| API Gateway | `k7swililhf` | `uwyulweese` |
| Properties table | `nesw-properties-staging` | `nesw-properties-production` |
| Users table | `nesw-users-staging` | `nesw-users-production` |
| Files bucket | `nesw-portal-files-staging` | `nesw-portal-files-production` |
| Frontend bucket | `nesw-portal-frontend-staging` | `nesw-portal-frontend-production` |
| CloudFront | `NESW_PORTAL_CF_DIST_ID` (secret) | `E2RGEUZBDE4USD` |

## Deploy Flow

```bash
# Deploy to staging
git push origin main          # triggers CI automatically

# Deploy to production
git checkout production
git merge main
git push                      # triggers CI automatically
git checkout main
```

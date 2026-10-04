# GarageHub requirements implementation status

Source: `req.md`  
Last reviewed: 2026-09-17

## Confirmed product decisions

- GarageHub is a generic hackathon product and must not be tied to a specific workshop or branch name.
- Estimate approval order is **Workshop Manager → Customer → Owner**.
- A customer may deselect any estimated part; the recalculated total must be used for subsequent owner approval and work authorization.

## Status legend

- **Implemented** — available in the current application.
- **Foundation** — database/API model and authorization exist; specialized UI or provider integration remains.
- **Partial** — usable UI exists but one or more required rules are missing.
- **Not started** — no functional implementation yet.

## Foundation delivered

| Area | Status | Notes |
| --- | --- | --- |
| API and database | Implemented | ASP.NET Core 8 API, EF Core, SQLite local development, PostgreSQL production provider. |
| Authentication | Implemented | JWT login with PBKDF2 password hashing and eight-hour sessions. |
| Actor roles | Implemented | Owner, Workshop Manager, Driver, Technician, Head Mechanic, Accountant, Washing, WA/WB, CRM Executive, Customer. Owner, Workshop Manager and Accountant share intake, job-card, vehicle-history and pickup/drop permissions. |
| Role access | Implemented | API policies restrict customer personal data, users, inventory, audit, pickup, and actor-specific job queues. |
| Audit trail | Foundation | Job creation/stage changes, inventory creation, and notification scheduling are audited. More mutations must be added. |
| Notification scheduler | Foundation | Persistent reminders and queued notifications with a local delivery adapter. Real WhatsApp/SMS/push providers remain. |
| Document storage | Implemented | Authenticated PDF/image upload with validation, private Supabase Storage, and expiring signed downloads. |
| Attendance | Foundation | Login, lunch-out, lunch-in, and logout events are persistent. Salary rules/UI remain. |

## Local end-to-end workflow studio

The authenticated **Workflow Studio** now provides a complete, organization-persisted hackathon flow across every actor. It includes:

- Validated local RC, insurance and PUC uploads, with customer-visible metadata.
- English, Hindi, Marathi and Kannada pickup disclosures with typed signatures and timestamps.
- Driver assignment, reassignment field, photo/licence record, Maps directions, ETA/status notifications, 8 exterior + 2 interior evidence, and handover signature.
- Nine-state journey covering the eight required pending queues plus Delivered, with blocking transition gates.
- Technician acceptance, exclusive work timer, mandatory general check-up, red/orange findings and replacement intervals.
- Estimate lines, customer selection of any part, immutable customer labour, local supplier inquiry, stock/order/receipt status and 100% advance rule.
- Manager → Customer → Owner estimate approvals.
- Washing and WA/WB department start/complete queues, ETA and final workshop closure.
- GST/General Bill, editable numbering, estimate variance and Accountant → Manager → Owner invoice approval.
- Payment, normal/provisional credit gate passes, cash-after-drop driver confirmation and final delivery.
- CSV inventory import, low-stock display, CRM reminders, referral rewards, attendance/payroll cost, job P&L and a local notification outbox.

The studio state is stored as a versioned EF Core snapshot owned by the authenticated user's organization. Every role in that organization reads the same state, receives updates through polling, and uses optimistic concurrency to avoid silently overwriting another session. Authentication remains local to the browser, while sample files and message delivery stay local so no cloud service is required.

## Workshop workflow mapping

| Requirement | Status | Remaining work |
| --- | --- | --- |
| RC, insurance, PUC documents | Foundation | Add intake/customer document screens, expiry validation, document replacement history. |
| Four intake scenarios | Partial | All four scenarios are captured and pickup records are created; scenario-specific legal/document branching remains. |
| Insurance type and multilingual disclosures | Not started | Marathi, Kannada, Hindi and English legal content, versioning, sequential acceptance and signature UI. |
| Manager/owner consent notifications | Foundation | Notification engine exists; consent event templates and recipients remain. |
| Pickup scheduling and driver reassignment | Partial | Scheduler and API assignment model exist; reassignment UI, reminder policy and conflict handling remain. |
| Driver address, phone and Maps directions | Foundation | Data and role exist; driver-specific pickup screen and Google Maps deep link remain. |
| Driver photo and licence | Foundation | User fields exist; secure upload/review UI remains. |
| Pickup alarms and ETA notification | Foundation | Scheduler can repeat reminders; timing policy and driver controls remain. |
| Mandatory 8 exterior + 2 interior photos | Implemented | Intake captures real camera/gallery files, uploads resized images through the authenticated document API, and blocks creation until counts are met. |
| Damage marks D/S/C/P/R | Partial | Dent, scratch, crack, peeling and rust exist on the vehicle diagram. Photo-level overlays remain. |
| Driver-created signed job card | Partial | Printable job card exists; driver signature and photographed job-card handover remain. |
| Full customer and vehicle master data | Partial | Core identity/vehicle fields exist in API; intake UI does not expose every field. |
| Fuel and vehicle accessories checklist | Partial | Fuel and present/missing/damaged conditions for the standard list are captured; quantities and Other notes remain. |
| Customer Voice immutable additions | Partial | Concerns exist; append-only items, owner-approved edit/delete and notifications remain. |
| Personal belongings/estimate disclaimer | Not started | Add versioned signature flow. |
| Estimate and delivery commitments | Partial | Dates exist; reminder cadence, edits and recipient notifications remain. |
| Technician assignment acceptance | Partial | Assignment exists; acceptance state and all recipient notifications remain. |
| General check-up checklist | Not started | Mandatory completion, red/orange findings, replacement interval and hidden internal photos. |
| Parts Excel import | Not started | Add validated spreadsheet import and reconciliation preview. |
| Supplier WhatsApp enquiry package | Not started | Add selectable vehicle/part photos and provider adapter. |
| Parts availability/advance rules | Foundation | Inventory and advance fields exist; two-day/100% advance decision flow remains. |
| Owner estimate approval alarms | Foundation | Role/reminders exist; three-minute policy and approval screen remain. |
| Customer estimate terms and selection | Partial | API enforces Manager → Customer → Owner ordering and accepts the customer's selected items; legal acceptance, UI migration and total recalculation remain. |
| Technician work timer | Partial | Task status exists; exclusive active timer, pause/resume and profitability linkage remain. |
| Washing and WA/WB handoffs | Foundation | Roles and pending-work state exist; department queue controls and ETA notifications remain. |
| Final trial/workshop closure | Partial | Quality stage exists; trial participants and closure gates remain. |
| Invoice review chain and variance | Partial | Billing UI and invoice model exist; accountant → manager → owner approval chain remains. |
| GST and General Bill numbering | Foundation | Invoice type/number fields exist; editable sequences, tax configuration and PDF output remain. |
| Payment and gate pass | Implemented | Gate pass cannot be issued until paid in the current UI/store. Credit drop/cash collection API model exists. |
| Drop-off and cash received | Foundation | Assignment fields exist; driver completion UI and final closure automation remain. |

## Additional features

| Feature | Status | Remaining work |
| --- | --- | --- |
| Eight pending queues | Foundation | API validates all named stages; existing frontend uses an older seven-stage presentation and must migrate. |
| Google review request | Not started | Add delivery trigger, review URL and opt-out tracking. |
| Referral rewards | Foundation | Reward points field exists; earning, ledger, redemption and reporting remain. |
| Inventory and low-stock alerts | Partial | Persistent inventory, thresholds and dashboard counts exist; transactions, purchase orders and alerts remain. |
| CRM reminders | Foundation | CRM role and scheduler exist; service/insurance/PUC/birthday/anniversary policies and campaign UI remain. |
| Profit/loss | Not started | Add labour cost, parts consumption, overhead allocation and reports. |
| Attendance and salaries | Partial | Attendance events exist; shifts, leave, pay rates and salary calculation remain. |
| Customer birthday/anniversary messaging | Foundation | Profile dates and messaging adapter exist; templates/schedules remain. |
| Employee permissions | Partial | Server role policies and organization account administration exist; granular per-user overrides remain. |
| Customer PII restriction | Implemented in API | Customer list is limited to Owner, Manager and Accountant. Portal records are organization-scoped and synchronized by the backend. |
| Vehicle ownership/sale deletion | Partial | Vehicle can be deactivated in the model; customer workflow and retention policy remain. |
| Notification-volume review | Foundation | Notifications are persistent; add recipient/channel analytics and configurable quiet hours. |

## Highest-priority remaining work

1. Add annotated photo overlays and lifecycle cleanup for abandoned uploads.
2. Add field-level server commands and granular per-user permissions beyond the current role-gated snapshot workflow.
3. Add malware scanning for uploaded documents/photos.
4. Configure real push/SMS/WhatsApp delivery, retries, templates, quiet hours and delivery receipts.
5. Add backups, monitoring and an automated regression test project around the validated integration flows.

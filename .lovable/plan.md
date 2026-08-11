# Expanded property listing details

The listing form currently collects title, address, town, postcode, rent, deposit, photos, NI Landlord Registration Number, heating type, the Fair Fuel toggle and tenant preference chips. That is enough to publish, but a tenant browsing the feed can't tell how many bedrooms it has, whether it's furnished, or when they could move in. This adds the missing basics.

## New fields on a listing

**Property basics**
- Property type: House, Apartment/Flat, Bungalow, Terrace, Semi-detached, Detached, Room in shared house
- Bedrooms (number)
- Bathrooms (number)
- Furnished status: Furnished, Part-furnished, Unfurnished

**Availability**
- Available from (date)
- Minimum tenancy: 6 months, 12 months, Flexible

**Description**
- Free-text description, up to 2,000 characters, with a short prompt suggesting what to mention (layout, condition, area, transport)

**Features and running costs**
- Bills included: multi-select chips (None, Broadband, Water, Electricity, Heating oil/gas, Bins)
- Parking: None, On-street, Driveway, Allocated space, Garage
- Garden: None, Shared, Private yard, Private garden
- Optional extras as chips: Washing machine, Dishwasher, Wheelchair accessible, Double glazing, Alarm

All new fields are optional apart from property type, bedrooms and furnished status, so existing listings keep working.

## Where it appears

- **Create listing form** (landlord dashboard, Properties tab): a new "Property basics" step after the address step, plus availability, description and features steps before tenant requirements.
- **Edit listing page** (`/dashboard/listing-edit`): the same fields, so existing listings can be filled in.
- **Listing card** in the browse feed: bedrooms, bathrooms, property type and furnished status as compact icon stats under the rent.
- **Listing detail page**: a "Property details" block with the full spec grid, an availability line, the description, and feature chips grouped under Bills included / Outside / Extras.

Browse filters for these new fields are a separate piece of work and are not included here.

## Technical notes

- One migration adding nullable columns to `public.property_listings`: `property_type text`, `bedrooms smallint`, `bathrooms smallint`, `furnished text`, `available_from date`, `min_tenancy_months smallint`, `description text`, `bills_included text[] default '{}'`, `parking text`, `garden text`, `features text[] default '{}'`. No new tables, so existing access rules carry over unchanged.
- Option lists live in one shared constants module imported by the create form, the edit form and the detail page, so the three stay in sync.
- Client-side validation with zod: description capped at 2,000 characters, bedrooms 0-10, bathrooms 1-5, available-from not in the past.
- The available-from picker uses the shadcn date picker with month/year dropdowns, matching the passport wizard's date fields.
- Card and detail rendering guards every new field for null so listings created before this change still render cleanly.
/*
# Make sponsor region optional

Sponsors no longer carry a region. The region is selected directly on the offer.
This makes the region column on sponsors nullable so existing data is not lost,
but the app will no longer set or read it.

1. Modified Tables
- `sponsors` — relax `region` from NOT NULL to nullable
2. Notes
- No data loss: existing sponsor rows keep their values; the column simply becomes optional.
- The app now sets the region on offers directly, not inherited from sponsors.
*/

ALTER TABLE sponsors ALTER COLUMN region DROP NOT NULL;

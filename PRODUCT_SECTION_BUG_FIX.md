# BUGFIX: New Product Always Saves to Wrong Section (Coffee)

Status: root cause confirmed by reading the code — urgent, ready to implement
Reported by: Giorgi
File: admin/admin.js only. No schema/RLS/DB changes, unrelated to the image-compression PRD.

## Symptom

When the admin filters the Products tab to "Chocolate" (შოკოლადი) or "Tea" (ჩაი) and clicks "+ add product" (`#addProductBtn`), the new product is saved under Coffee (ყავა) regardless of which section filter was active.

## Root cause (confirmed directly in admin.js)

- The "+ add product" click handler (around line 814) calls `openProductModal(null)` with no argument — it never passes the currently selected value of the section filter dropdown (`#productSectionFilter`).
- Inside `openProductModal()` (line 424), the `<option>` list for the section `<select>` (`#pfSection`) only marks an option `selected` when editing an EXISTING product whose `section_id` matches the option. For a brand-new product, `product` is `null`, so no option is ever marked `selected`.
- With no option explicitly selected, the browser defaults the `<select>` to its FIRST `<option>` — whichever section happens to be first in the `sections` array (in practice Coffee, since it's the first/lowest-sort_order section).
- The admin, having already filtered to Chocolate or Tea before clicking "+ add product", reasonably assumes the modal already knows the section, doesn't notice the dropdown silently defaulted to Coffee, and saves — submitting `section_id` = Coffee's id.

This is a pure front-end pre-selection bug isolated to `openProductModal()` and its one caller. It is not a database/RLS issue.

## Fix

1. Change the `#addProductBtn` click handler to pass the current section filter's value when opening the modal for a new product:
   `openProductModal(null, $('#productSectionFilter').value || null)`
2. Change the function signature from `openProductModal(product)` to `openProductModal(product, presetSectionId)`.
3. In the `sectionOptions` map, mark an option `selected` when EITHER:
   - editing an existing product and `product.section_id === s.id` (existing behavior, keep), OR
   - adding a new product (`product` is null/undefined) and `presetSectionId === s.id`.
4. If the filter was set to "ყველა სექცია" (all sections, empty value) when "+ add product" was clicked, there is no section to preset — leave the existing default (first option in the list); the admin must pick manually in that case, which is expected, not a bug.

## Acceptance criteria

- [ ] Filter Products tab to "Chocolate", click "+ add product" → the modal's section dropdown already shows Chocolate selected, and saving without touching the dropdown creates the product under Chocolate.
- [ ] Same test for "Tea".
- [ ] Filter set to "ყველა სექცია" (all) → dropdown still defaults to the first section as before (admin picks manually) — expected, not a regression.
- [ ] Editing an existing product still pre-selects that product's actual current section, exactly as before this fix.
- [ ] No changes to schema, RLS, other admin tabs, or the public site.

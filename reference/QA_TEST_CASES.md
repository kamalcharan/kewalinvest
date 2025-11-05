# QA Test Cases - Investment Management Platform
**Version:** 1.0
**Last Updated:** 2025-10-22
**Environment:** Live & Test

---

## Test Case Priority Levels
- **P0 (Critical):** Core functionality, blocks major workflows
- **P1 (High):** Important features, affects user experience
- **P2 (Medium):** Secondary features, minor impact
- **P3 (Low):** Nice-to-have, edge cases

## Test Types
- **FUN:** Functional Testing
- **INT:** Integration Testing
- **UI:** User Interface Testing
- **SEC:** Security Testing
- **PERF:** Performance Testing
- **REG:** Regression Testing

---

# 1. AUTHENTICATION & AUTHORIZATION

## 1.1 Signup/Registration

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| AUTH-001 | New user signup with valid data | 1. Navigate to signup page<br>2. Enter valid email, password, company name<br>3. Click Register | User account created, redirected to login/dashboard | P0 | FUN |
| AUTH-002 | Signup with existing email | 1. Try to register with already registered email | Error: "Email already exists" | P0 | FUN |
| AUTH-003 | Signup with invalid email format | 1. Enter invalid email (e.g., "test@", "test.com") | Validation error shown | P1 | FUN |
| AUTH-004 | Signup with weak password | 1. Enter password not meeting requirements | Error showing password requirements | P1 | FUN |
| AUTH-005 | Signup with missing required fields | 1. Leave required fields empty<br>2. Try to submit | Form validation prevents submission | P1 | FUN |
| AUTH-006 | Email verification flow | 1. Complete signup<br>2. Check for verification email<br>3. Click verification link | Email received, account verified | P1 | FUN |
| AUTH-007 | Multi-tenant isolation on signup | 1. Create tenant A<br>2. Create tenant B<br>3. Login to each | Each tenant sees only their data | P0 | SEC |

## 1.2 Signin/Login

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| AUTH-101 | Login with valid credentials | 1. Enter correct email and password<br>2. Click Login | Successfully logged in, redirected to dashboard | P0 | FUN |
| AUTH-102 | Login with invalid password | 1. Enter correct email, wrong password | Error: "Invalid credentials" | P0 | FUN |
| AUTH-103 | Login with non-existent email | 1. Enter email not in system | Error: "Invalid credentials" | P0 | FUN |
| AUTH-104 | Login with empty fields | 1. Leave email/password empty<br>2. Try to login | Form validation error | P1 | FUN |
| AUTH-105 | Session persistence | 1. Login<br>2. Refresh page<br>3. Close and reopen browser | Session maintained (if "Remember me" selected) | P1 | FUN |
| AUTH-106 | Logout functionality | 1. Click Logout | User logged out, redirected to login, session cleared | P0 | FUN |
| AUTH-107 | Login rate limiting | 1. Attempt 10+ failed logins rapidly | Account temporarily locked or CAPTCHA shown | P1 | SEC |
| AUTH-108 | SQL injection attempts | 1. Enter SQL code in login fields | No SQL execution, proper error handling | P0 | SEC |

## 1.3 Password Management

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| AUTH-201 | Forgot password flow | 1. Click "Forgot Password"<br>2. Enter email<br>3. Check email<br>4. Click reset link | Password reset email received, link works | P1 | FUN |
| AUTH-202 | Reset password with valid token | 1. Use reset link<br>2. Enter new password<br>3. Confirm new password | Password updated, can login with new password | P1 | FUN |
| AUTH-203 | Reset password with expired token | 1. Use old/expired reset link | Error: "Token expired" | P1 | FUN |
| AUTH-204 | Change password while logged in | 1. Go to profile settings<br>2. Change password<br>3. Logout and login with new password | Password changed successfully | P1 | FUN |

## 1.4 Environment & Tenant Switching

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| AUTH-301 | Switch between Live and Test environments | 1. Login to Live<br>2. Switch to Test<br>3. Verify data | Only Live data in Live, only Test data in Test | P0 | FUN |
| AUTH-302 | Multi-tenant data isolation | 1. Create data in Tenant A<br>2. Switch to Tenant B | Tenant A data not visible in Tenant B | P0 | SEC |
| AUTH-303 | Environment indicator visibility | 1. Check UI in Live vs Test | Clear visual indicator showing current environment | P1 | UI |

---

# 2. CONTACTS MODULE

## 2.1 Contact Creation

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CON-001 | Create contact with all fields | 1. Click "New Contact"<br>2. Fill all fields (name, prefix, channels)<br>3. Save | Contact created, shown in list | P0 | FUN |
| CON-002 | Create contact with minimum required fields | 1. Fill only required fields (name)<br>2. Save | Contact created successfully | P0 | FUN |
| CON-003 | Create contact with duplicate name | 1. Create contact with existing name | Warning shown or allowed (no unique constraint) | P2 | FUN |
| CON-004 | Create contact with invalid email | 1. Enter invalid email format | Validation error shown | P1 | FUN |
| CON-005 | Create contact with invalid mobile | 1. Enter invalid mobile format | Validation error shown | P1 | FUN |
| CON-006 | Add multiple channels to contact | 1. Add email, mobile, landline<br>2. Set primary channel | All channels saved, primary marked correctly | P1 | FUN |
| CON-007 | Special characters in contact name | 1. Enter name with special chars (', ", etc.) | Name saved correctly, no encoding issues | P2 | FUN |

## 2.2 Contact Viewing & Search

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CON-101 | View contact list | 1. Navigate to Contacts page | All contacts displayed with pagination | P0 | FUN |
| CON-102 | Search contact by name | 1. Enter name in search box | Matching contacts shown | P0 | FUN |
| CON-103 | Search contact by email | 1. Enter email in search | Contact with that email shown | P1 | FUN |
| CON-104 | Search contact by mobile | 1. Enter mobile number | Contact with that mobile shown | P1 | FUN |
| CON-105 | Search with partial match | 1. Enter partial name (e.g., "Joh" for "John") | Contacts with matching substring shown | P1 | FUN |
| CON-106 | Search with no results | 1. Search for non-existent contact | "No results found" message shown | P2 | UI |
| CON-107 | Case-insensitive search | 1. Search with different cases (john, JOHN, John) | Same results for all cases | P1 | FUN |
| CON-108 | View contact details | 1. Click on a contact card | Contact detail page opens with all info | P0 | FUN |
| CON-109 | Pagination functionality | 1. Navigate through pages<br>2. Change page size | Correct contacts shown per page | P1 | UI |

## 2.3 Contact Editing

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CON-201 | Edit contact name | 1. Open contact<br>2. Edit name<br>3. Save | Name updated successfully | P0 | FUN |
| CON-202 | Add new channel to existing contact | 1. Open contact<br>2. Add email/mobile<br>3. Save | Channel added successfully | P1 | FUN |
| CON-203 | Edit existing channel | 1. Modify email/mobile<br>2. Save | Channel updated | P1 | FUN |
| CON-204 | Delete channel from contact | 1. Remove a channel<br>2. Save | Channel removed | P1 | FUN |
| CON-205 | Change primary channel | 1. Set different channel as primary<br>2. Save | Primary channel updated | P1 | FUN |
| CON-206 | Edit contact and cancel | 1. Make changes<br>2. Click Cancel | Changes not saved | P2 | UI |

## 2.4 Contact Deletion/Deactivation

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CON-301 | Deactivate contact (not a customer) | 1. Deactivate contact<br>2. Confirm | Contact marked inactive, not shown in active list | P1 | FUN |
| CON-302 | Try to delete contact that is a customer | 1. Try to delete contact linked to customer | Error: "Cannot delete, contact is a customer" | P0 | FUN |
| CON-303 | Reactivate deactivated contact | 1. Find inactive contact<br>2. Reactivate | Contact active again | P1 | FUN |
| CON-304 | Filter active/inactive contacts | 1. Apply active/inactive filter | Correct contacts shown | P1 | FUN |

## 2.5 Contact to Customer Conversion

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CON-401 | Convert contact to customer | 1. Open contact<br>2. Click "Convert to Customer"<br>3. Fill customer details<br>4. Save | Customer created, linked to contact | P0 | FUN |
| CON-402 | Try to convert existing customer | 1. Try to convert contact that's already a customer | Error: "Already a customer" | P0 | FUN |
| CON-403 | Convert and add addresses | 1. Convert contact<br>2. Add addresses during conversion | Customer created with addresses | P1 | FUN |

---

# 3. CUSTOMERS MODULE

## 3.1 Customer Creation

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CUS-001 | Create customer from new contact | 1. Click "New Customer"<br>2. Enter contact + customer details<br>3. Save | Contact and customer created | P0 | FUN |
| CUS-002 | Create customer with PAN | 1. Enter valid PAN<br>2. Save | PAN saved and encrypted | P0 | FUN |
| CUS-003 | Create customer with IWELL code | 1. Enter IWELL code<br>2. Save | IWELL code saved and encrypted | P0 | FUN |
| CUS-004 | Create customer with duplicate PAN | 1. Enter existing PAN | Warning or error shown | P1 | FUN |
| CUS-005 | Create customer with duplicate IWELL code | 1. Enter existing IWELL code | Warning or error shown | P1 | FUN |
| CUS-006 | Create customer with invalid PAN format | 1. Enter invalid PAN | Validation error | P1 | FUN |
| CUS-007 | Create customer with date of birth | 1. Enter DOB<br>2. Save | DOB saved, age calculated | P1 | FUN |
| CUS-008 | Create customer with future DOB | 1. Enter future date | Validation error | P2 | FUN |
| CUS-009 | Create customer with anniversary date | 1. Enter anniversary date<br>2. Save | Date saved correctly | P2 | FUN |
| CUS-010 | Create customer as family member | 1. Enter family_head_iwell_code<br>2. Save | Customer created, linked to family head | P1 | FUN |
| CUS-011 | Create customer with referral | 1. Select referring customer<br>2. Save | Referral link created | P2 | FUN |

## 3.2 Customer Viewing & Search

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CUS-101 | View all customers | 1. Navigate to Customers page | Customer list with cards displayed | P0 | FUN |
| CUS-102 | Search customer by name | 1. Enter name in search | Matching customers shown | P0 | FUN |
| CUS-103 | Search customer by PAN | 1. Enter PAN in search | Customer with PAN shown | P1 | FUN |
| CUS-104 | Search customer by IWELL code | 1. Enter IWELL code | Customer shown | P0 | FUN |
| CUS-105 | Search by family head name | 1. Enter family head name | Family members shown | P1 | FUN |
| CUS-106 | View customer card details | 1. Check customer card | Name, IWELL code, badges, portfolio value shown | P0 | UI |
| CUS-107 | Pagination in customer list | 1. Navigate pages<br>2. Change page size | Correct pagination behavior | P1 | UI |
| CUS-108 | Customer card sorting | 1. Change sort order (name, date, etc.) | Customers sorted correctly | P1 | UI |
| CUS-109 | Empty state when no customers | 1. View customers with no data | "No customers found" message | P2 | UI |

## 3.3 Customer Filters

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CUS-201 | Filter by Active/Inactive | 1. Select Active filter | Only active customers shown | P0 | FUN |
| CUS-202 | Filter by Survival Status (Alive) | 1. Select Alive filter | Only alive customers shown | P1 | FUN |
| CUS-203 | Filter by Survival Status (Deceased) | 1. Select Deceased filter | Only deceased customers shown | P1 | FUN |
| CUS-204 | Filter by Onboarding Status | 1. Select status (pending/completed) | Filtered list shown | P1 | FUN |
| CUS-205 | Filter by Has Address | 1. Select "Has Address" filter | Only customers with addresses shown | P1 | FUN |
| CUS-206 | Filter by Account Type - Individual | 1. Select "Individual" filter | Only individual (non-family) customers shown | P0 | FUN |
| CUS-207 | Filter by Account Type - Family | 1. Select "Family" filter | Only family customers (heads + members) shown | P0 | FUN |
| CUS-208 | Filter by Bookmarked | 1. Select "Bookmarked" filter | Only bookmarked customers shown | P1 | FUN |
| CUS-209 | Filter by Bookmark Reason | 1. Select specific bookmark reason | Customers with that reason shown | P2 | FUN |
| CUS-210 | Combine multiple filters | 1. Apply Active + Family + Bookmarked | Customers matching all criteria shown | P1 | FUN |
| CUS-211 | Clear all filters | 1. Apply filters<br>2. Click Clear | All customers shown again | P1 | UI |
| CUS-212 | Advanced filters (date ranges) | 1. Open advanced filters<br>2. Set date range | Customers within date range shown | P1 | FUN |

## 3.4 Customer Statistics

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CUS-301 | View Total Customers count | 1. Check statistics dashboard | Correct total count displayed | P0 | FUN |
| CUS-302 | View Active Customers count | 1. Check Active stat | Correct active count | P0 | FUN |
| CUS-303 | View Inactive Customers count | 1. Check Inactive stat | Correct inactive count | P1 | FUN |
| CUS-304 | View Alive/Deceased counts | 1. Check survival stats | Correct counts for each | P1 | FUN |
| CUS-305 | View Family Accounts count | 1. Check Family stat | Shows correct number of unique families | P0 | FUN |
| CUS-306 | View Customers in Families count | 1. Check Family stat subtext | Shows total customers in all families (heads + members) | P0 | FUN |
| CUS-307 | View Recent 30 Days count | 1. Check recent additions | Correct count of customers added in last 30 days | P1 | FUN |
| CUS-308 | View Bookmarked count | 1. Check bookmarked stat | Correct count for current user's bookmarks | P1 | FUN |
| CUS-309 | Click on statistic card to filter | 1. Click on any stat card | Customers list filtered accordingly | P1 | FUN |
| CUS-310 | Statistics real-time update | 1. Create new customer<br>2. Check stats | Stats update immediately | P1 | FUN |

## 3.5 Customer Editing

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CUS-401 | Edit customer PAN | 1. Open customer<br>2. Edit PAN<br>3. Save | PAN updated | P0 | FUN |
| CUS-402 | Edit customer IWELL code | 1. Edit IWELL code<br>2. Save | IWELL code updated | P0 | FUN |
| CUS-403 | Update survival status to Deceased | 1. Change to Deceased<br>2. Enter date of death<br>3. Save | Status updated, date saved | P1 | FUN |
| CUS-404 | Update onboarding status | 1. Change onboarding status<br>2. Save | Status updated | P1 | FUN |
| CUS-405 | Update family details | 1. Change family_head_iwell_code<br>2. Save | Family link updated | P1 | FUN |
| CUS-406 | Remove from family | 1. Clear family_head_iwell_code<br>2. Save | Customer becomes individual | P1 | FUN |
| CUS-407 | Edit referral information | 1. Change referral details<br>2. Save | Referral updated | P2 | FUN |
| CUS-408 | Edit and cancel | 1. Make changes<br>2. Cancel | No changes saved | P2 | UI |

## 3.6 Customer Addresses

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CUS-501 | Add address to customer | 1. Open customer<br>2. Add address<br>3. Fill details<br>4. Save | Address added | P0 | FUN |
| CUS-502 | Add multiple addresses | 1. Add residential, office, mailing addresses | All addresses saved | P1 | FUN |
| CUS-503 | Set primary address | 1. Mark address as primary | Address marked primary, others unmarked | P1 | FUN |
| CUS-504 | Edit existing address | 1. Modify address details<br>2. Save | Address updated | P1 | FUN |
| CUS-505 | Delete address | 1. Delete address<br>2. Confirm | Address removed | P1 | FUN |
| CUS-506 | Validate required address fields | 1. Leave required fields empty | Validation error shown | P1 | FUN |
| CUS-507 | View addresses on customer card | 1. Check customer card | Address count badge shown | P1 | UI |

## 3.7 Customer Bookmarks

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CUS-601 | Bookmark a customer | 1. Click bookmark icon<br>2. Select reason<br>3. Save | Customer bookmarked | P1 | FUN |
| CUS-602 | Bookmark with custom reason | 1. Bookmark customer<br>2. Enter custom reason<br>3. Save | Custom reason saved | P1 | FUN |
| CUS-603 | Add notes to bookmark | 1. Bookmark and add notes<br>2. Save | Notes saved | P2 | FUN |
| CUS-604 | Remove bookmark | 1. Click bookmark icon on bookmarked customer<br>2. Confirm | Bookmark removed | P1 | FUN |
| CUS-605 | View bookmarked customers only | 1. Apply bookmark filter | Only bookmarked customers shown | P1 | FUN |
| CUS-606 | Bookmark visibility per user | 1. User A bookmarks customer<br>2. Login as User B | User B doesn't see User A's bookmarks | P1 | SEC |
| CUS-607 | Edit bookmark reason | 1. Edit existing bookmark<br>2. Change reason<br>3. Save | Reason updated | P2 | FUN |

## 3.8 Family Accounts

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CUS-701 | View family badge on member | 1. View family member customer card | Badge shows "Family: [head_iwell_code]" | P0 | UI |
| CUS-702 | View family badge on head | 1. View family head customer card | Badge shows "Family Head: [iwell_code]" | P0 | UI |
| CUS-703 | No badge on individual customer | 1. View individual (non-family) customer | No family badge shown | P0 | UI |
| CUS-704 | Hover on family member badge | 1. Hover over family badge (300ms delay) | Popover shows family head + all members | P0 | UI |
| CUS-705 | Hover on family head badge | 1. Hover over head badge | Popover shows head + all members | P0 | UI |
| CUS-706 | Click family member in popover | 1. Open popover<br>2. Click on a member | Navigate to that member's detail page | P1 | FUN |
| CUS-707 | Popover shows correct data | 1. Open family popover | Shows full name + IWELL code for each member | P0 | UI |
| CUS-708 | Empty string vs NULL family code | 1. Check customer with family_head_iwell_code = '' | Treated as individual, no badge shown | P0 | FUN |
| CUS-709 | Statistics - Family count accuracy | 1. Check family count stat | Shows correct number of unique families (not counting empty strings) | P0 | FUN |
| CUS-710 | Statistics - Customers in families | 1. Check customers in families count | Shows total customers (heads + members) in all families | P0 | FUN |
| CUS-711 | Filter by Family account type | 1. Select Account Type: Family | Shows all family heads + all family members | P0 | FUN |
| CUS-712 | Filter by Individual account type | 1. Select Account Type: Individual | Shows only customers NOT in any family (excluding empty strings) | P0 | FUN |
| CUS-713 | Click Family statistics card | 1. Click on "X Family Accounts" card | Filters to show family customers | P1 | FUN |

## 3.9 Customer Deactivation/Deletion

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CUS-801 | Deactivate customer | 1. Deactivate customer<br>2. Confirm | Customer marked inactive | P1 | FUN |
| CUS-802 | Reactivate customer | 1. Find inactive customer<br>2. Reactivate | Customer active again | P1 | FUN |
| CUS-803 | Deactivate customer with portfolio | 1. Try to deactivate customer with active portfolio | Warning shown or allowed with confirmation | P1 | FUN |
| CUS-804 | Deactivate family head | 1. Deactivate customer who is family head | Warning shown about family members | P1 | FUN |

---

# 4. CUSTOMER DASHBOARD (Detail View)

## 4.1 Dashboard Overview

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| DASH-001 | Navigate to customer dashboard | 1. Click on customer card | Dashboard opens with customer details | P0 | FUN |
| DASH-002 | View customer header info | 1. Check header section | Shows name, ID, IWELL code, family badge, schemes count, member since | P0 | UI |
| DASH-003 | Tab navigation (Overview, Portfolio, Goals, Transactions) | 1. Click each tab | Tab changes, correct content shown | P0 | UI |
| DASH-004 | Deep link to specific tab | 1. Use URL with ?tab=portfolio | Opens correct tab directly | P1 | FUN |
| DASH-005 | Back navigation | 1. Click back button | Returns to customer list | P1 | UI |
| DASH-006 | Edit customer from dashboard | 1. Click Edit button<br>2. Make changes<br>3. Save | Customer updated, dashboard refreshes | P0 | FUN |

## 4.2 Portfolio Tab

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| DASH-101 | View portfolio summary | 1. Open Portfolio tab | Shows total value, schemes, returns, allocation | P0 | FUN |
| DASH-102 | Portfolio donut chart | 1. View allocation chart | Chart renders correctly with scheme breakdown | P0 | UI |
| DASH-103 | Portfolio performance sparkline | 1. View performance chart | Sparkline shows trend over time | P1 | UI |
| DASH-104 | Change portfolio timeframe | 1. Select 1M, 3M, 6M, 1Y, ALL | Data updates for selected period | P1 | FUN |
| DASH-105 | Customer with no portfolio | 1. View customer without portfolio | "No portfolio data" message shown | P1 | UI |
| DASH-106 | Portfolio gap alert | 1. Check if gap alert shows for incomplete data | Alert shown when applicable | P2 | UI |
| DASH-107 | Portfolio data refresh | 1. Add transaction<br>2. Check portfolio | Portfolio updates with new data | P0 | INT |

## 4.3 Transactions Tab

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| DASH-201 | View customer transactions | 1. Open Transactions tab | List of transactions shown | P0 | FUN |
| DASH-202 | Transaction table columns | 1. Check transaction table | Shows date, scheme, type, amount, units, NAV, etc. | P0 | UI |
| DASH-203 | Sort transactions | 1. Click column headers to sort | Transactions sorted by that column | P1 | UI |
| DASH-204 | Filter transactions by type | 1. Select transaction type filter | Filtered transactions shown | P1 | FUN |
| DASH-205 | Filter transactions by date range | 1. Set date range filter | Transactions in range shown | P1 | FUN |
| DASH-206 | Transaction pagination | 1. Navigate transaction pages | Correct pagination behavior | P1 | UI |
| DASH-207 | No transactions state | 1. View customer with no transactions | "No transactions" message shown | P2 | UI |
| DASH-208 | Export transactions | 1. Click export button | Transactions downloaded as CSV/Excel | P2 | FUN |

## 4.4 Goals/JTBD Tab

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| DASH-301 | View customer goals | 1. Open Goals tab | List of goals/JTBDs shown | P1 | FUN |
| DASH-302 | Add new goal | 1. Click Add Goal<br>2. Fill details<br>3. Save | Goal added to customer | P1 | FUN |
| DASH-303 | Edit existing goal | 1. Edit goal<br>2. Save | Goal updated | P1 | FUN |
| DASH-304 | Delete goal | 1. Delete goal<br>2. Confirm | Goal removed | P1 | FUN |
| DASH-305 | Mark goal as completed | 1. Mark goal complete | Status updated | P1 | FUN |
| DASH-306 | No goals state | 1. View customer with no goals | "No goals" message with CTA to add | P2 | UI |

## 4.5 Family Navigation from Dashboard

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| DASH-401 | View family badge on dashboard header | 1. Open family member dashboard | Family badge shown in header | P0 | UI |
| DASH-402 | Hover family badge in dashboard | 1. Hover over family badge | Popover with family members shown | P0 | UI |
| DASH-403 | Navigate to family member from dashboard | 1. Click family member in popover | Navigate to that member's dashboard | P0 | FUN |
| DASH-404 | Family head dashboard indicator | 1. Open family head dashboard | Shows "Family Head" badge | P0 | UI |

---

# 5. IMPORTS MODULE

## 5.1 Transaction Import

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| IMP-001 | Import valid transaction file | 1. Upload valid CSV/Excel file<br>2. Map columns<br>3. Import | Transactions imported successfully | P0 | FUN |
| IMP-002 | Import with all required fields | 1. File has date, scheme, amount, units, NAV | All transactions imported | P0 | FUN |
| IMP-003 | Import with missing required fields | 1. Upload file missing required columns | Error: "Missing required fields" | P0 | FUN |
| IMP-004 | Import with invalid date format | 1. File has dates in wrong format | Error or conversion attempt shown | P1 | FUN |
| IMP-005 | Import with invalid numeric values | 1. File has non-numeric amounts | Error shown for invalid rows | P1 | FUN |
| IMP-006 | Import with family head IWELL code | 1. File has family_head_iwell_code instead of individual codes | System resolves to individual customer PAN/codes | P0 | FUN |
| IMP-007 | Import with unrecognized IWELL code | 1. File has IWELL code not in system | Error: "Customer not found" with row details | P0 | FUN |
| IMP-008 | Import with duplicate transactions | 1. Import same file twice | Duplicate detection or handling | P1 | FUN |
| IMP-009 | Import large file (1000+ rows) | 1. Upload large file | Progress indicator shown, all rows processed | P1 | PERF |
| IMP-010 | Import file format validation | 1. Upload non-CSV/Excel file | Error: "Invalid file format" | P1 | FUN |
| IMP-011 | Import preview before confirmation | 1. Upload file<br>2. View preview | Shows sample rows for verification | P1 | UI |
| IMP-012 | Import with partial success | 1. File has some valid, some invalid rows | Valid rows imported, error report for invalid ones | P0 | FUN |
| IMP-013 | Download import error report | 1. Complete import with errors<br>2. Download error report | CSV with error details downloaded | P1 | FUN |
| IMP-014 | Cancel import mid-process | 1. Start import<br>2. Cancel during processing | Import cancelled, no partial data saved | P2 | FUN |

## 5.2 Other Data Imports

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| IMP-101 | Import customer data | 1. Upload customer bulk import file | Customers created/updated | P1 | FUN |
| IMP-102 | Import contact data | 1. Upload contact bulk import file | Contacts created/updated | P1 | FUN |
| IMP-103 | Import with data validation | 1. Upload file with validation errors | Validation errors shown before import | P1 | FUN |
| IMP-104 | Import rollback on failure | 1. Import fails midway | No partial data saved, rollback successful | P1 | FUN |

---

# 6. NAV DOWNLOADS

## 6.1 NAV Data Download

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| NAV-001 | Download NAV data | 1. Navigate to NAV Downloads<br>2. Select date range<br>3. Download | NAV data file downloaded | P0 | FUN |
| NAV-002 | Download NAV for specific scheme | 1. Filter by scheme<br>2. Download | Only selected scheme NAV downloaded | P1 | FUN |
| NAV-003 | Download NAV with date range | 1. Set start and end date<br>2. Download | NAV data for date range downloaded | P1 | FUN |
| NAV-004 | Download NAV in CSV format | 1. Select CSV format<br>2. Download | CSV file downloaded with correct data | P1 | FUN |
| NAV-005 | Download NAV in Excel format | 1. Select Excel format<br>2. Download | Excel file downloaded | P1 | FUN |
| NAV-006 | NAV data accuracy | 1. Download NAV<br>2. Verify against source | Data matches source accurately | P0 | FUN |
| NAV-007 | Download with no data available | 1. Select date range with no NAV data | Message: "No data available for selected criteria" | P2 | UI |
| NAV-008 | Download large NAV dataset | 1. Download 1+ year of daily NAV | File generated successfully within reasonable time | P1 | PERF |

## 6.2 NAV Data Management

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| NAV-101 | Upload/Update NAV data | 1. Upload NAV file<br>2. Confirm | NAV data updated in system | P0 | FUN |
| NAV-102 | View latest NAV | 1. Check NAV display | Shows most recent NAV date and value | P1 | UI |
| NAV-103 | Historical NAV data | 1. Query historical NAV | Returns correct historical values | P1 | FUN |

---

# 7. INDEX DOWNLOADS

## 7.1 Index Data Download

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| IDX-001 | Download index data | 1. Navigate to Index Downloads<br>2. Select index<br>3. Download | Index data file downloaded | P0 | FUN |
| IDX-002 | Download specific index (Nifty, Sensex, etc.) | 1. Select index from dropdown<br>2. Download | Selected index data downloaded | P1 | FUN |
| IDX-003 | Download index with date range | 1. Set date range<br>2. Download | Index data for range downloaded | P1 | FUN |
| IDX-004 | Download multiple indices | 1. Select multiple indices<br>2. Download | All selected indices in one file | P1 | FUN |
| IDX-005 | Index data accuracy | 1. Download index data<br>2. Verify values | Data matches official sources | P0 | FUN |
| IDX-006 | Download format options | 1. Select CSV or Excel<br>2. Download | File in selected format | P1 | FUN |

---

# 8. INDEX AND NAV CHARTS

## 8.1 Chart Rendering

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CHT-001 | View NAV chart | 1. Navigate to NAV chart page<br>2. Select scheme | Chart renders correctly | P0 | UI |
| CHT-002 | View Index chart | 1. Navigate to Index chart page<br>2. Select index | Chart renders correctly | P0 | UI |
| CHT-003 | Chart timeframe selection | 1. Select 1M, 3M, 6M, 1Y, ALL | Chart updates with correct data | P1 | FUN |
| CHT-004 | Chart zoom functionality | 1. Zoom in/out on chart | Zoom works smoothly | P1 | UI |
| CHT-005 | Chart pan functionality | 1. Drag chart to pan | Pan works correctly | P1 | UI |
| CHT-006 | Chart tooltip on hover | 1. Hover over data points | Tooltip shows date and value | P1 | UI |
| CHT-007 | Chart legend toggle | 1. Click legend items | Series shown/hidden | P1 | UI |
| CHT-008 | Chart data accuracy | 1. Compare chart values with raw data | Values match exactly | P0 | FUN |
| CHT-009 | Chart performance with large dataset | 1. Load 5+ years of daily data | Chart renders within 2 seconds | P1 | PERF |
| CHT-010 | Chart responsive on mobile | 1. View chart on mobile device | Chart adapts to screen size | P1 | UI |

## 8.2 Chart Comparison

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CHT-101 | Compare multiple NAVs | 1. Select 2+ schemes<br>2. View comparison chart | All NAVs shown on same chart | P1 | FUN |
| CHT-102 | Compare NAV vs Index | 1. Select scheme and index<br>2. View comparison | NAV and index plotted together | P1 | FUN |
| CHT-103 | Normalize comparison (percentage) | 1. Enable percentage view | All series start at 100%, show relative change | P1 | FUN |
| CHT-104 | Comparison legend clarity | 1. View comparison chart | Clear distinction between series (color, label) | P1 | UI |

## 8.3 Chart Export

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| CHT-201 | Export chart as image (PNG) | 1. Click export<br>2. Select PNG | Image file downloaded | P2 | FUN |
| CHT-202 | Export chart as PDF | 1. Click export<br>2. Select PDF | PDF file downloaded | P2 | FUN |
| CHT-203 | Export chart data as CSV | 1. Click export data<br>2. Select CSV | CSV with chart data downloaded | P2 | FUN |

---

# 9. ADMIN FUNCTIONALITY

## 9.1 User Management

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| ADM-001 | Admin view all users | 1. Login as admin<br>2. Navigate to Users | All users in tenant shown | P0 | FUN |
| ADM-002 | Admin create new user | 1. Click Add User<br>2. Fill details<br>3. Save | User created, invitation sent | P0 | FUN |
| ADM-003 | Admin edit user details | 1. Edit user<br>2. Update info<br>3. Save | User updated | P1 | FUN |
| ADM-004 | Admin deactivate user | 1. Deactivate user | User cannot login, data preserved | P0 | FUN |
| ADM-005 | Admin reactivate user | 1. Reactivate deactivated user | User can login again | P1 | FUN |
| ADM-006 | Admin delete user | 1. Delete user<br>2. Confirm | User removed from system | P1 | FUN |
| ADM-007 | Admin assign roles | 1. Assign role to user<br>2. Save | User has new role permissions | P0 | SEC |
| ADM-008 | Admin reset user password | 1. Click reset password for user | Password reset email sent to user | P1 | FUN |
| ADM-009 | Non-admin cannot access user management | 1. Login as non-admin<br>2. Try to access Users | Access denied | P0 | SEC |

## 9.2 Tenant Management

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| ADM-101 | View tenant settings | 1. Navigate to Tenant Settings | Tenant info displayed | P0 | FUN |
| ADM-102 | Update tenant details | 1. Edit tenant name, info<br>2. Save | Tenant updated | P1 | FUN |
| ADM-103 | Manage tenant subscription | 1. View subscription details | Shows plan, limits, billing | P1 | FUN |
| ADM-104 | Tenant data isolation | 1. Verify data access | Users only see their tenant data | P0 | SEC |

## 9.3 System Configuration

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| ADM-201 | Configure system settings | 1. Update settings<br>2. Save | Settings applied | P1 | FUN |
| ADM-202 | Manage master data (bookmark reasons, etc.) | 1. Add/Edit master data<br>2. Save | Master data updated | P1 | FUN |
| ADM-203 | View system logs | 1. Navigate to Logs | System activity logs shown | P2 | FUN |
| ADM-204 | Export audit logs | 1. Export logs | Log file downloaded | P2 | FUN |

## 9.4 Data Management

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| ADM-301 | Bulk data operations | 1. Select multiple records<br>2. Perform bulk action | Action applied to all selected | P1 | FUN |
| ADM-302 | Data cleanup utilities | 1. Run cleanup jobs | Orphaned/invalid data cleaned | P2 | FUN |
| ADM-303 | Database backup | 1. Trigger backup | Backup created successfully | P0 | FUN |
| ADM-304 | Database restore | 1. Restore from backup | Data restored correctly | P0 | FUN |

---

# 10. CROSS-CUTTING CONCERNS

## 10.1 Performance

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| PERF-001 | Page load time - Customer list | 1. Load customer list (100 customers) | Page loads within 2 seconds | P1 | PERF |
| PERF-002 | Page load time - Dashboard | 1. Load customer dashboard with portfolio | Dashboard loads within 3 seconds | P1 | PERF |
| PERF-003 | Search responsiveness | 1. Type in search box | Results appear within 500ms | P1 | PERF |
| PERF-004 | Filter application speed | 1. Apply multiple filters | Results update within 1 second | P1 | PERF |
| PERF-005 | Large dataset handling (1000+ customers) | 1. View list with 1000+ customers | Pagination and rendering smooth | P1 | PERF |
| PERF-006 | Chart rendering performance | 1. Load chart with 1 year daily data | Chart renders within 2 seconds | P1 | PERF |
| PERF-007 | Import performance (1000 rows) | 1. Import 1000 transaction rows | Completes within 30 seconds | P1 | PERF |
| PERF-008 | Concurrent user load | 1. 50 users logged in simultaneously | System remains responsive | P0 | PERF |

## 10.2 Security

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| SEC-001 | SQL injection protection | 1. Enter SQL in input fields | No SQL execution, proper sanitization | P0 | SEC |
| SEC-002 | XSS protection | 1. Enter script tags in inputs | Scripts not executed, properly escaped | P0 | SEC |
| SEC-003 | CSRF protection | 1. Attempt CSRF attack | Token validation prevents attack | P0 | SEC |
| SEC-004 | Authentication token expiry | 1. Wait for token expiry<br>2. Try to access protected route | Redirected to login | P0 | SEC |
| SEC-005 | Sensitive data encryption (PAN) | 1. Check database for PAN values | PAN stored encrypted | P0 | SEC |
| SEC-006 | Sensitive data encryption (IWELL code) | 1. Check database for IWELL codes | IWELL codes stored encrypted | P0 | SEC |
| SEC-007 | API endpoint authorization | 1. Try to access API without token | 401 Unauthorized response | P0 | SEC |
| SEC-008 | Role-based access control | 1. User tries to access admin functions | Access denied for non-admin | P0 | SEC |
| SEC-009 | Password strength validation | 1. Try weak passwords | Validation enforces strong passwords | P1 | SEC |
| SEC-010 | Secure password storage | 1. Check database for passwords | Passwords hashed (bcrypt/argon2) | P0 | SEC |
| SEC-011 | HTTPS enforcement | 1. Try to access via HTTP | Redirected to HTTPS | P0 | SEC |
| SEC-012 | Session hijacking prevention | 1. Attempt session hijacking | Session tied to IP/browser fingerprint | P1 | SEC |

## 10.3 UI/UX Consistency

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| UI-001 | Consistent navigation across pages | 1. Navigate through all pages | Navigation bar consistent | P1 | UI |
| UI-002 | Responsive design - Desktop | 1. View on desktop (1920x1080) | Layout optimal | P0 | UI |
| UI-003 | Responsive design - Tablet | 1. View on tablet (768x1024) | Layout adapts properly | P1 | UI |
| UI-004 | Responsive design - Mobile | 1. View on mobile (375x667) | Layout mobile-friendly | P1 | UI |
| UI-005 | Dark mode consistency | 1. Switch to dark mode<br>2. Navigate pages | All pages support dark mode | P1 | UI |
| UI-006 | Light mode consistency | 1. Use light mode<br>2. Navigate pages | All pages support light mode | P1 | UI |
| UI-007 | Theme toggle functionality | 1. Toggle between light/dark | Theme switches correctly | P1 | UI |
| UI-008 | Loading states | 1. Trigger async operations | Loading indicators shown | P1 | UI |
| UI-009 | Error states | 1. Trigger errors | Clear error messages shown | P1 | UI |
| UI-010 | Empty states | 1. View pages with no data | Helpful empty state messages with CTAs | P1 | UI |
| UI-011 | Button states (hover, active, disabled) | 1. Interact with buttons | Visual feedback for all states | P2 | UI |
| UI-012 | Form validation feedback | 1. Submit invalid forms | Clear inline validation messages | P1 | UI |
| UI-013 | Confirmation dialogs | 1. Perform destructive actions | Confirmation dialog shown | P1 | UI |
| UI-014 | Success notifications | 1. Complete actions successfully | Success toast/notification shown | P1 | UI |
| UI-015 | Error notifications | 1. Actions fail | Error notification with details shown | P1 | UI |

## 10.4 Accessibility

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| ACC-001 | Keyboard navigation | 1. Navigate using only keyboard | All interactive elements accessible | P1 | UI |
| ACC-002 | Screen reader compatibility | 1. Use screen reader (NVDA/JAWS) | Proper labels and ARIA attributes | P2 | UI |
| ACC-003 | Focus indicators | 1. Tab through elements | Clear focus indicators visible | P1 | UI |
| ACC-004 | Color contrast | 1. Check text/background contrast | Meets WCAG AA standards | P1 | UI |
| ACC-005 | Alt text for images | 1. Check image alt attributes | All images have descriptive alt text | P2 | UI |

## 10.5 Browser Compatibility

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| BRW-001 | Chrome compatibility | 1. Test all features on Chrome latest | All features work | P0 | UI |
| BRW-002 | Firefox compatibility | 1. Test on Firefox latest | All features work | P1 | UI |
| BRW-003 | Safari compatibility | 1. Test on Safari latest | All features work | P1 | UI |
| BRW-004 | Edge compatibility | 1. Test on Edge latest | All features work | P1 | UI |
| BRW-005 | Mobile browser (Safari iOS) | 1. Test on iPhone Safari | All features work | P1 | UI |
| BRW-006 | Mobile browser (Chrome Android) | 1. Test on Android Chrome | All features work | P1 | UI |

## 10.6 Data Integrity

| ID | Test Scenario | Test Steps | Expected Result | Priority | Type |
|---|---|---|---|---|---|
| DATA-001 | Live/Test environment data separation | 1. Create data in Live<br>2. Switch to Test | Data not visible across environments | P0 | SEC |
| DATA-002 | Tenant data isolation | 1. Create data in Tenant A<br>2. Switch to Tenant B | No data leakage between tenants | P0 | SEC |
| DATA-003 | Transaction rollback on error | 1. Trigger error during multi-step operation | Partial changes rolled back | P0 | FUN |
| DATA-004 | Concurrent edit handling | 1. Two users edit same record<br>2. Both save | Conflict detection or last-write-wins | P1 | FUN |
| DATA-005 | Data validation on backend | 1. Send invalid data via API | Backend validation rejects data | P0 | SEC |
| DATA-006 | Foreign key integrity | 1. Try to delete referenced record | Error or cascade delete based on design | P0 | FUN |
| DATA-007 | Orphaned data prevention | 1. Delete parent records | No orphaned child records remain | P1 | FUN |

---

# 11. REGRESSION TEST SUITE

## 11.1 Critical Path Tests (Run Before Each Release)

| ID | Test Scenario | Priority |
|---|---|---|
| REG-001 | Login with valid credentials | P0 |
| REG-002 | Create new contact | P0 |
| REG-003 | Create new customer from contact | P0 |
| REG-004 | View customer list with filters | P0 |
| REG-005 | View customer dashboard | P0 |
| REG-006 | Import transaction file | P0 |
| REG-007 | View portfolio on dashboard | P0 |
| REG-008 | Family account badge display | P0 |
| REG-009 | Family statistics accuracy | P0 |
| REG-010 | Search customer by IWELL code | P0 |
| REG-011 | Add customer address | P0 |
| REG-012 | Bookmark customer | P0 |
| REG-013 | Download NAV data | P0 |
| REG-014 | View NAV/Index chart | P0 |
| REG-015 | Logout successfully | P0 |

## 11.2 Smoke Test Suite (Quick Sanity Check)

| ID | Test Scenario | Time Estimate |
|---|---|---|
| SMOKE-001 | Login/Logout | 1 min |
| SMOKE-002 | Navigate all main pages | 2 min |
| SMOKE-003 | Create contact and customer | 3 min |
| SMOKE-004 | View customer dashboard | 2 min |
| SMOKE-005 | Apply one filter | 1 min |
| SMOKE-006 | Search functionality | 1 min |
| **Total** | | **10 min** |

---

# 12. TEST DATA REQUIREMENTS

## 12.1 Required Test Data

### Contacts
- 100 contacts with varied data:
  - 70 with email only
  - 20 with mobile only
  - 10 with multiple channels
  - 5 inactive contacts

### Customers
- 84 customers total:
  - 67 individuals (with family_head_iwell_code = NULL or '')
  - 17 in 16 families:
    - 10 families with 1 head + 1 member
    - 5 families with 1 head + 2 members
    - 1 family with 1 head + 0 members (edge case)
  - 60 with PAN
  - 80 with IWELL code
  - 10 deceased customers
  - 15 inactive customers
  - 25 with addresses
  - Various onboarding statuses

### Transactions
- 500+ transactions across customers
- Mix of purchase, redemption, switch, dividend
- Various dates (last 5 years)
- Some with family head IWELL codes
- Some edge cases (large amounts, fractional units)

### Portfolio Data
- 30 customers with active portfolios
- Various schemes (equity, debt, hybrid)
- Different portfolio sizes

### NAV Data
- Daily NAV for 50+ schemes
- Last 3 years of data

### Index Data
- Nifty, Sensex, other indices
- Last 5 years of data

---

# 13. DEFECT REPORTING TEMPLATE

## Defect Format

**Bug ID:** [AUTO-GENERATED]
**Module:** [e.g., Customers, Dashboard, Imports]
**Priority:** [P0/P1/P2/P3]
**Severity:** [Critical/High/Medium/Low]
**Status:** [New/In Progress/Fixed/Closed/Reopen]

**Summary:** Brief one-line description

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:** What should happen

**Actual Result:** What actually happens

**Environment:**
- Browser: [Chrome 120, Firefox 121, etc.]
- OS: [Windows 11, macOS 14, etc.]
- Environment: [Live/Test]
- User Role: [Admin/User]

**Attachments:**
- Screenshots
- Screen recordings
- Console logs
- Network logs

**Additional Notes:** Any other relevant information

---

# 14. TEST EXECUTION TRACKING

## Test Execution Status Template

| Module | Total Tests | Passed | Failed | Blocked | Not Run | Pass % |
|---|---|---|---|---|---|---|
| Authentication | 26 | 0 | 0 | 0 | 26 | 0% |
| Contacts | 27 | 0 | 0 | 0 | 27 | 0% |
| Customers | 81 | 0 | 0 | 0 | 81 | 0% |
| Dashboard | 27 | 0 | 0 | 0 | 27 | 0% |
| Imports | 18 | 0 | 0 | 0 | 18 | 0% |
| NAV Downloads | 11 | 0 | 0 | 0 | 11 | 0% |
| Index Downloads | 6 | 0 | 0 | 0 | 6 | 0% |
| Charts | 17 | 0 | 0 | 0 | 17 | 0% |
| Admin | 20 | 0 | 0 | 0 | 20 | 0% |
| Cross-Cutting | 54 | 0 | 0 | 0 | 54 | 0% |
| **TOTAL** | **287** | **0** | **0** | **0** | **287** | **0%** |

---

# 15. KNOWN ISSUES / LIMITATIONS

## Current Known Issues (To Be Fixed)

### ISSUE-001: Family Customer Count Discrepancy
- **Module:** Customers - Family Accounts
- **Description:** Statistics showing "16 families (16 customers)" but should show "16 families (17+ customers)"
- **Impact:** Incorrect customer count in family statistics
- **Status:** In Progress
- **Fix ETA:** TBD

---

# 16. TEST SIGN-OFF

## Sign-Off Criteria

Testing is considered complete when:
- [ ] All P0 tests pass (100%)
- [ ] All P1 tests pass (95%+)
- [ ] All P2 tests pass (90%+)
- [ ] No critical/high severity defects open
- [ ] Regression suite passes
- [ ] Performance benchmarks met
- [ ] Security tests pass
- [ ] UAT completed successfully

## Sign-Off

| Role | Name | Signature | Date |
|---|---|---|---|
| QA Lead | | | |
| Development Lead | | | |
| Product Owner | | | |
| Stakeholder | | | |

---

**END OF TEST CASES DOCUMENT**

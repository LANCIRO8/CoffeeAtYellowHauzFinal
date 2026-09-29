import os, re

files = [
    "src/components/customer/CustomerHome.tsx",
    "src/components/customer/CustomerMenu.tsx",
    "src/components/customer/CustomerOrders.tsx",
    "src/components/customer/CustomerReservation.tsx",
    "src/components/customer/CustomerFloorPlan.tsx",
    "src/components/customer/VenueReservation.tsx",
    "src/components/pos/AdminDashboard.tsx",
    "src/components/pos/PosMenu.tsx",
    "src/components/pos/TableManagement.tsx",
    "src/components/pos/TicketManagement.tsx",
    "src/components/pos/SalesAnalytics.tsx",
    "src/components/pos/SalesReports.tsx",
    "src/components/pos/InventoryManager.tsx",
    "src/components/pos/SettingsManager.tsx",
    "src/components/pos/CashierAccountManager.tsx"
]

for f in files:
    if not os.path.exists(f): continue
    content = open(f).read()
    matches = re.findall(r'<button[\s\S]*?</button>', content)
    multi_span = [m for m in matches if m.count('<span') >= 2]
    if len(multi_span) >= 5:
        print(f"FILE: {f} ({len(multi_span)} buttons)")
        for i, b in enumerate(multi_span[:8]):
            # print first 150 chars cleaned
            c = " ".join(b.split())
            print(f"  [{i+1}] {c[:120]}")

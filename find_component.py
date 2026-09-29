import os, re

files = [
    "src/components/customer/CustomerHome.tsx",
    "src/components/customer/CustomerMenu.tsx",
    "src/components/customer/CustomerOrders.tsx",
    "src/components/customer/CustomerReservation.tsx",
    "src/components/customer/CustomerAccountView.tsx",
    "src/components/pos/StaffLogin.tsx",
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
    txt = open(f).read()
    # Find the top-level return statement in the component
    # We want to inspect the direct div children of the root element
    print("="*50)
    print(f)
    # Search for button tags in div 3 or similar
    # Let us see if button:nth-of-type(7) could exist
    btn_blocks = re.findall(r'<button[\s\S]*?</button>', txt)
    print(f"Total buttons: {len(btn_blocks)}")

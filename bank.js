export const BANKS = ["MCB", "SBM Bank", "Absa Bank Mauritius", "AfrAsia Bank", "Bank One", "MauBank", "HSBC Mauritius", "Standard Chartered", "Other"];

// Only the last 4 digits are ever stored - the full account number never touches the database.
export function bankFromInput(b) {
  const bankName = String(b.bankName || "").trim();
  const holder = String(b.holder || "").trim();
  const acct = String(b.accountNumber || "").replace(/\s/g, "");
  if (!BANKS.includes(bankName)) return { error: "Please choose your bank" };
  if (holder.length < 2) return { error: "Please enter the account holder's name" };
  if (!/^\d{8,20}$/.test(acct)) return { error: "Account number should be 8-20 digits" };
  return { bank: { bankName, holder, last4: acct.slice(-4), linkedAt: new Date().toISOString(), verified: true } };
}

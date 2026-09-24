"use client";
// Single icon library for the whole app: Lucide (line icons). Don't mix in emoji or other sets.
import {
  Users, Plane, TreePalm, House, Utensils, PartyPopper, GraduationCap, Briefcase, Car, Tent, Heart, Trophy,
  Coffee, Wine, ShoppingCart, CarTaxiFront, Fuel, BedDouble, Ticket, Gift, Receipt,
  LoaderCircle, CircleAlert, Clock, CircleCheck, CheckCheck, Flag, CircleX, Trash2,
} from "lucide-react";

export const GROUP_ICON = { users: Users, plane: Plane, palm: TreePalm, home: House, utensils: Utensils, party: PartyPopper, graduation: GraduationCap, briefcase: Briefcase, car: Car, tent: Tent, heart: Heart, trophy: Trophy };
export const GROUP_ICON_LABEL = { users: "Group", plane: "Trip", palm: "Holiday", home: "Home", utensils: "Food", party: "Party", graduation: "Study", briefcase: "Work", car: "Car", tent: "Camping", heart: "Family", trophy: "Sport" };

export const CATEGORY_ICON = { Food: Utensils, Coffee: Coffee, Drinks: Wine, Groceries: ShoppingCart, Transport: CarTaxiFront, Fuel: Fuel, Stay: BedDouble, Travel: Plane, Fun: Ticket, Home: House, Gifts: Gift, General: Receipt };

export const STATUS_ICON = { processing: LoaderCircle, review: CircleAlert, pending: Clock, confirmed: CircleCheck, settled: CheckCheck, flag: Flag, error: CircleX, removed: Trash2 };

export function GroupIcon({ icon, size = 20 }) {
  const I = GROUP_ICON[icon] || Users;
  return <I size={size} strokeWidth={1.8} aria-hidden />;
}
export function CategoryIcon({ category, size = 20 }) {
  const I = CATEGORY_ICON[category] || Receipt;
  return <I size={size} strokeWidth={1.8} aria-hidden />;
}

// Logo: a loop made of two connected segments - money moving fairly between people.
export function LogoMark({ size = 28, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className="logo-mark">
      <path d="M7.2 20.5A10 10 0 0 1 20.5 6.9" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M24.8 11.5A10 10 0 0 1 11.5 25.1" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="24.6" cy="7.4" r="2.3" fill={color} />
      <circle cx="7.4" cy="24.6" r="2.3" fill={color} />
    </svg>
  );
}

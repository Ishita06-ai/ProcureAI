import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Frontend RBAC helper — mirrors the role sets enforced server-side via requireRole().
export function hasRole(user, ...roles) {
  return !!user && roles.includes(user.role);
}
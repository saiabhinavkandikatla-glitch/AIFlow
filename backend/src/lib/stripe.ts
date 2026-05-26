import Stripe from "stripe";
import { env, isStripeConfigured } from "../config/env.js";

export const stripe = isStripeConfigured ? new Stripe(env.STRIPE_SECRET_KEY!) : null;

export const requireStripe = () => {
  if (!stripe) {
    throw new Error("Stripe Billing is not configured.");
  }
  return stripe;
};

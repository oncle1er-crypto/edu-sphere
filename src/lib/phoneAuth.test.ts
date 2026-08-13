import { describe, it, expect } from "vitest";
import { isValidPhone10, phoneToLoginEmail, resolveLoginEmail, PHONE_EMAIL_DOMAIN } from "./phoneAuth";

// Logique de résolution de l'identifiant de connexion (email OU téléphone à
// 10 chiffres) — utilisée directement par LoginPage.handleEmailAuth pour
// décider quoi envoyer à supabase.auth.signInWithPassword. Une régression
// ici bloquerait la connexion de tous les utilisateurs concernés.

describe("isValidPhone10", () => {
  it("accepte exactement 10 chiffres", () => {
    expect(isValidPhone10("0102030405")).toBe(true);
  });
  it("refuse moins ou plus de 10 chiffres", () => {
    expect(isValidPhone10("010203040")).toBe(false);
    expect(isValidPhone10("01020304056")).toBe(false);
  });
  it("refuse les caractères non numériques", () => {
    expect(isValidPhone10("010203040a")).toBe(false);
    expect(isValidPhone10("01-02-03-04")).toBe(false);
  });
});

describe("phoneToLoginEmail", () => {
  it("construit l'email interne à partir du numéro", () => {
    expect(phoneToLoginEmail("0102030405")).toBe(`0102030405@${PHONE_EMAIL_DOMAIN}`);
  });
});

describe("resolveLoginEmail", () => {
  it("reconnaît un email valide tel quel", () => {
    expect(resolveLoginEmail("admin@ecole.ci")).toEqual({ email: "admin@ecole.ci", kind: "email" });
  });

  it("reconnaît un numéro à 10 chiffres et le convertit en email interne", () => {
    expect(resolveLoginEmail("0102030405")).toEqual({
      email: `0102030405@${PHONE_EMAIL_DOMAIN}`,
      kind: "phone",
    });
  });

  it("nettoie espaces, points et tirets avant de valider le numéro", () => {
    expect(resolveLoginEmail("01 02 03 04 05")).toEqual({
      email: `0102030405@${PHONE_EMAIL_DOMAIN}`,
      kind: "phone",
    });
    expect(resolveLoginEmail("01-02-03-04-05")).toEqual({
      email: `0102030405@${PHONE_EMAIL_DOMAIN}`,
      kind: "phone",
    });
  });

  it("rejette une chaîne vide ou uniquement des espaces", () => {
    expect(resolveLoginEmail("")).toBeNull();
    expect(resolveLoginEmail("   ")).toBeNull();
  });

  it("rejette un identifiant qui n'est ni un email ni un numéro à 10 chiffres", () => {
    expect(resolveLoginEmail("abc123")).toBeNull();
    expect(resolveLoginEmail("12345")).toBeNull();
  });
});

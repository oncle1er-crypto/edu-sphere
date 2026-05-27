import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sha256, generateBackupCode } from "@/lib/crypto";

export type MfaFactor = {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: "verified" | "unverified";
  created_at: string;
};

export type AAL = "aal1" | "aal2" | null;

export function useMfa() {
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [currentLevel, setCurrentLevel] = useState<AAL>(null);
  const [nextLevel, setNextLevel] = useState<AAL>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: lf }, { data: aal }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    const totp = (lf?.totp ?? []) as MfaFactor[];
    setFactors(totp);
    setCurrentLevel((aal?.currentLevel as AAL) ?? null);
    setNextLevel((aal?.nextLevel as AAL) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const enroll = useCallback(async (friendlyName: string) => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName,
    });
    if (error) throw error;
    return data;
  }, []);

  const verifyEnrollment = useCallback(async (factorId: string, code: string) => {
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr) throw chErr;
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code,
    });
    if (error) throw error;
    return data;
  }, []);

  const challenge = useCallback(async (factorId: string) => {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) throw error;
    return data;
  }, []);

  const verifyChallenge = useCallback(
    async (factorId: string, challengeId: string, code: string) => {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code,
      });
      if (error) throw error;
      return data;
    },
    []
  );

  const unenroll = useCallback(async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;
  }, []);

  /** Génère 10 backup codes, stocke uniquement les hashes, retourne les codes en clair (une seule fois) */
  const generateBackupCodes = useCallback(async (userId: string) => {
    const codes = Array.from({ length: 10 }, () => generateBackupCode());
    const rows = await Promise.all(
      codes.map(async (c) => ({ user_id: userId, code_hash: await sha256(c) }))
    );
    // Supprime les anciens
    await supabase.from("mfa_backup_codes").delete().eq("user_id", userId);
    const { error } = await supabase.from("mfa_backup_codes").insert(rows);
    if (error) throw error;
    return codes;
  }, []);

  return {
    factors,
    currentLevel,
    nextLevel,
    loading,
    refresh,
    enroll,
    verifyEnrollment,
    challenge,
    verifyChallenge,
    unenroll,
    generateBackupCodes,
    isEnrolled: factors.some((f) => f.status === "verified"),
    needsMfaStepUp: nextLevel === "aal2" && currentLevel !== "aal2",
  };
}

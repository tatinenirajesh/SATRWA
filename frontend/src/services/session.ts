import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "satrwa_session_v2";

export type UserRole =
  | "OWNER"
  | "TENANT"
  | "CORPORATE"
  | "ADMIN";

export type Session = {

  id: string;

  role: UserRole;

  block: string;

  flat_no: string;

  bhk_type: "2BHK" | "3BHK";

  owner_name?: string;

  tenant_name?: string;

  phone?: string;

  email: string;

  corporate_covered?: boolean;

  corporate_payer_name?: string | null;

  approved?: boolean;

  last_login?: string;

};

export async function saveSession(session: Session) {

  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(session),
  );

}

export async function getSession(): Promise<Session | null> {

  const value = await AsyncStorage.getItem(KEY);

  if (!value) return null;

  return JSON.parse(value);

}

export async function clearSession() {

  await AsyncStorage.removeItem(KEY);

}
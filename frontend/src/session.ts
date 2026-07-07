import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "satrwa_session_v1";

export type Session = {
  block: string;
  flat_no: string;
  bhk_type: "2BHK" | "3BHK";
  owner_name?: string;
  phone?: string;
  email?: string;
  start_month: string;
  corporate_covered?: boolean;
  corporate_payer_name?: string | null;
};

export async function saveSession(s: Session) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}
export async function getSession(): Promise<Session | null> {
  const v = await AsyncStorage.getItem(KEY);
  return v ? JSON.parse(v) : null;
}
export async function clearSession() {
  await AsyncStorage.removeItem(KEY);
}

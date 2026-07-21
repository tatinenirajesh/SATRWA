import { API } from "@/src/theme";

type ApiResponse<T = any> = {
  ok: boolean;
  data?: T;
  error?: string;
};

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    console.log("=================================");
    console.log("API =", API);
    console.log("URL =", `${API}${url}`);
    console.log("=================================");
    const response = await fetch(`${API}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      ...options,
    });

    const json = await response.json();

    if (!response.ok) {
      let message = "Something went wrong.";

      if (typeof json.detail === "string") {
        message = json.detail;
      } else if (Array.isArray(json.detail)) {
        message = json.detail
          .map((x: any) => x.msg)
          .join("\n");
      }

      return {
        ok: false,
        error: message,
      };
    }

    return {
      ok: true,
      data: json,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e.message || "Unable to connect to server.",
    };
  }
}

/* ---------------------- AUTH ---------------------- */

export async function login(
  role: string,
  email: string,
  pin: string
) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      role,
      email,
      pin,
    }),
  });
}

export async function sendOTP(
  email: string
) {
  return request("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({
      email,
    }),
  });
}

export async function registerOwner(payload: {
  role: string;
  block: string;
  flat_no: string;
  bhk_type: string;
  owner_name: string;
  phone: string;
  email: string;
  otp: string;
  pin: string;
  confirm_pin: string;
}) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ---------------------- ADMIN ---------------------- */

export async function pendingRegistrations() {
  return request("/admin/pending-registrations");
}

export async function approveRegistration(
  registration_id: string,
  pin: string
) {
  return request("/admin/approve-registration", {
    method: "POST",
    body: JSON.stringify({
      registration_id,
      pin,
    }),
  });
}

export async function maintenanceSummary(
  email: string,
) {
  return request(
    `/api/maintenance/summary?email=${encodeURIComponent(email)}`
  );
}

export async function maintenanceHistory(
    email:string,
){
    return request(
        `/api/maintenance/history?email=${encodeURIComponent(email)}`
    );
}

export async function gymAvailability(
    booking_date: string,
) {
    return request(
        `/gym/availability?booking_date=${booking_date}`
    );
}

export async function gymMembership(
    body: any,
) {
    return request("/gym/membership", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function gymBook(
    body: any,
) {
    return request("/gym/book", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function poolAvailability(
    booking_date: string,
) {
    return request(
        `/pool/availability?booking_date=${booking_date}`
    );
}

export async function poolMembership(
    body: any,
) {
    return request("/pool/membership", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function poolBook(
    body: any,
) {
    return request("/pool/book", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function guestRoomAvailability(
    checkin_date: string,
) {
    return request(
        `/guest-room/availability?checkin_date=${checkin_date}`
    );
}

export async function guestRoomBook(
    body: any,
) {
    return request("/guest-room/book", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function hallAvailability(
    booking_date: string,
) {
    return request(
        `/community-hall/availability?booking_date=${booking_date}`
    );
}

export async function hallBook(
    body: any,
) {
    return request("/community-hall/book", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function gymStatus(
    email:string,
){
    return request(
        `/gym/status?email=${encodeURIComponent(email)}`
    );
}

export async function pendingPayments(){

    return request(
        "/api/admin/pending-payments"
    );

}
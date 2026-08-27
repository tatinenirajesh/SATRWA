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
  email: string
) {
  return request(
    `/api/maintenance/summary?email=${encodeURIComponent(email)}`
  );
}

export async function maintenanceHistory(
  email: string
) {
  return request(
    `/api/maintenance/history?email=${encodeURIComponent(email)}`
  );
}

/* ---------------------- GYM ---------------------- */

export async function gymAvailability(
  booking_date: string
) {
  return request(
    `/api/gym/availability?booking_date=${encodeURIComponent(
      booking_date
    )}`
  );
}

export async function gymMembership(
  body: any
) {
  return request("/api/gym/membership", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function gymBook(
  body: any
) {
  return request("/api/gym/book", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ---------------------- POOL ---------------------- */

export async function poolAvailability(
  booking_date: string
) {
  return request(
    `/api/pool/availability?booking_date=${encodeURIComponent(
      booking_date
    )}`
  );
}

export async function poolMembership(
  body: any
) {
  return request("/api/pool/membership", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function poolBook(
  body: any
) {
  return request("/api/pool/book", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ---------------------- GUEST ROOM ---------------------- */

export async function guestRoomAvailability(
  checkin_date: string
) {
  return request(
    `/guest-house/availability?checkin_date=${encodeURIComponent(
      checkin_date
    )}`
  );
}

export async function guestRoomBook(
  body: any
) {
  return request("/guest-house/book", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function checkGuestRoomAvailability(
  checkin_date: string,
  checkin_time: string = "17:00"
) {
  return request(
    `/api/guest-room/availability?checkin_date=${encodeURIComponent(
      checkin_date
    )}&checkin_time=${encodeURIComponent(
      checkin_time
    )}`
  );
}

export async function bookGuestRoom(
  body: any
) {
  console.log("BOOK BODY:", body);

  const response = await fetch(
    `${API}/api/guest-house/book`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  console.log("BOOK STATUS:", response.status);

  const text = await response.text();

  console.log("BOOK RESPONSE:", text);

  return JSON.parse(text);
}

export async function bookGuestHouse(
  body: any
) {
  const response = await fetch(
    `${API}/api/guest-house/book`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  return await response.json();
}

export async function completeGuestRoomPayment(body: {
  payment_id: string;
  upi_id: string;
  upi_ref_no: string;
}) {
  const response = await fetch(
    `${API}/api/guest-house/payment-success`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  return response.json();
}

export async function completeGuestHousePayment(
  body: any
) {
  const response = await fetch(
    `${API}/api/guest-house/payment-success`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  return await response.json();
}

/* ---------------------- COMMUNITY HALL ---------------------- */

export async function hallAvailability(
  booking_date: string
) {
  return request(
    `/community-hall/availability?booking_date=${encodeURIComponent(
      booking_date
    )}`
  );
}

export async function hallBook(
  body: any
) {
  return request("/community-hall/book", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function checkCommunityHall(
  body: any
) {
  console.log("CHECK BODY:", body);

  const response = await fetch(
    `${API}/api/community-hall/check`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();

  console.log("STATUS:", response.status);
  console.log("RESPONSE:", data);

  return data;
}

export async function bookCommunityHall(
  body: any
) {
  const response = await fetch(
    `${API}/api/community-hall/book`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const text = await response.text();

  console.log("BOOK STATUS:", response.status);
  console.log("BOOK RESPONSE:", text);

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: text,
    };
  }
}

export async function completeCommunityHallPayment(
  body: any
) {
  try {
    const response = await fetch(
      `${API}/api/community-hall/payment-success`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    console.log(
      "PAYMENT STATUS:",
      response.status
    );

    const text = await response.text();

    console.log(
      "PAYMENT RESPONSE:",
      text
    );

    return JSON.parse(text);
  } catch (e) {
    console.log(
      "PAYMENT ERROR:",
      e
    );

    throw e;
  }
}

/* ---------------------- PAYMENTS ---------------------- */

export async function pendingPayments() {
  return request(
    "/api/admin/pending-payments"
  );
}

/* ---------------------- COMMERCIAL ---------------------- */

export async function commercialSendOTP(
  email: string
) {

  return request(
    "/api/commercial/send-otp",
    {
      method: "POST",

      body: JSON.stringify({
        email:
          email
            .trim()
            .toLowerCase(),
      }),
    }
  );

}


export async function commercialRegister(
  payload: {
    account_type: string;
    shop_name: string;
    owner_name: string;
    phone: string;
    email: string;
    pin: string;
    otp: string;
  }
) {
  return request(
    "/api/commercial/register",
    {
      method: "POST",

      body: JSON.stringify(
        payload
      ),
    }
  );
}

export async function commercialLogin(
  email: string,
  pin: string
) {
  return request(
    "/api/commercial/login",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        pin,
      }),
    }
  );
}

export async function submitMeterReading(
  email: string,
  reading: number
) {
  return request(
    "/api/commercial/meter-reading",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        reading,
      }),
    }
  );
}

export async function getCommercialCurrentBill(
  email: string
) {
  return request(
    `/api/commercial/current-bill?email=${encodeURIComponent(
      email
    )}`
  );
}

export async function getCommercialPaymentHistory(
  email: string
) {
  return request(
    `/api/commercial/payment-history?email=${encodeURIComponent(
      email
    )}`
  );
}

/* ---------------------- CORPORATE ---------------------- */

export async function corporateSendOTP(
  email: string
) {
  return request(
    "/api/corporate/send-otp",
    {
      method: "POST",

      body: JSON.stringify({
        email:
          email
            .trim()
            .toLowerCase(),
      }),
    }
  );
}


export async function corporateRegister(
  payload: {
    name: string;
    email: string;
    pin: string;
    otp: string;
  }
) {
  return request(
    "/api/corporate/register",
    {
      method: "POST",

      body: JSON.stringify(
        payload
      ),
    }
  );
}


export async function corporateLogin(
  email: string,
  pin: string
) {
  return request(
    "/api/corporate/login",
    {
      method: "POST",

      body: JSON.stringify({
        email:
          email
            .trim()
            .toLowerCase(),

        pin,
      }),
    }
  );
}


export async function getCorporateProfile(
  payerId: string
) {
  return request(
    `/api/corporate/profile?payer_id=${encodeURIComponent(
      payerId
    )}`
  );
}


export async function addCorporateFlat(
  payerId: string,
  block: string,
  flatNo: string,
  bhkType: "2BHK" | "3BHK" | "DUPLEX"
) {
  return request(
    "/api/corporate/flats/add",
    {
      method: "POST",

      body: JSON.stringify({
        payer_id:
          payerId,

        block,

        flat_no:
          flatNo,

        bhk_type:
          bhkType,
      }),
    }
  );
}


export async function removeCorporateFlat(
  payerId: string,
  block: string,
  flatNo: string
) {
  return request(
    "/api/corporate/flats/remove",
    {
      method: "POST",

      body: JSON.stringify({
        payer_id:
          payerId,

        block,

        flat_no:
          flatNo,
      }),
    }
  );
}


export async function requestCorporateGatePass(
  body: {
    payer_id: string;
    block: string;
    flat_no: string;
    move_out_date: string;
    vehicle_number: string;
    reason: string;
  }
) {
  return request(
    "/api/corporate/gate-pass/request",
    {
      method: "POST",

      body: JSON.stringify(
        body
      ),
    }
  );
}


export async function corporateRequestPinReset(
  email: string
) {
  return request(
    "/api/corporate/request-pin-reset",
    {
      method: "POST",

      body: JSON.stringify({
        email:
          email
            .trim()
            .toLowerCase(),
      }),
    }
  );
}


export async function corporateResetPin(
  email: string,
  otp: string,
  newPin: string,
  confirmPin: string
) {
  return request(
    "/api/corporate/reset-pin",
    {
      method: "POST",

      body: JSON.stringify({
        email:
          email
            .trim()
            .toLowerCase(),

        otp,

        new_pin:
          newPin,

        confirm_pin:
          confirmPin,
      }),
    }
  );
}
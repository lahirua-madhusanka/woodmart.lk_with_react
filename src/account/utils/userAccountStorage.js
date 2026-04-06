const ADDRESS_STORAGE_KEY = "userAccountAddresses";
const PROFILE_STORAGE_KEY = "userAccountProfileMeta";

const safeParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const loadRecord = (key) => safeParse(localStorage.getItem(key), {});

const saveRecord = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getUserAddresses = (userId) => {
  if (!userId) return [];
  const record = loadRecord(ADDRESS_STORAGE_KEY);
  return Array.isArray(record[userId]) ? record[userId] : [];
};

export const saveUserAddresses = (userId, addresses) => {
  if (!userId) return;
  const record = loadRecord(ADDRESS_STORAGE_KEY);
  record[userId] = Array.isArray(addresses) ? addresses : [];
  saveRecord(ADDRESS_STORAGE_KEY, record);
};

export const getUserPhone = (userId) => {
  if (!userId) return "";
  const record = loadRecord(PROFILE_STORAGE_KEY);
  return record[userId]?.phone || "";
};

export const saveUserPhone = (userId, phone) => {
  if (!userId) return;
  const record = loadRecord(PROFILE_STORAGE_KEY);
  record[userId] = {
    ...(record[userId] || {}),
    phone: String(phone || ""),
  };
  saveRecord(PROFILE_STORAGE_KEY, record);
};

"use client";
import { cn } from "@/utils/cn.util";
import { useState } from "react";
const PhoneInput = ({
  countries,
  placeholder = "+1 (555) 000-0000",
  onChange,
  selectPosition = "start", // Default position is 'start'
}) => {
  const isRtlLayout = false;
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [phoneNumber, setPhoneNumber] = useState("+1");
  const countryCodes = countries.reduce(
    (acc, { code, label }) => ({ ...acc, [code]: label }),
    {},
  );
  const handleCountryChange = (e) => {
    const newCountry = e.target.value;
    setSelectedCountry(newCountry);
    setPhoneNumber(countryCodes[newCountry]);
    if (onChange) {
      onChange(countryCodes[newCountry]);
    }
  };
  const handlePhoneNumberChange = (e) => {
    const newPhoneNumber = e.target.value;
    setPhoneNumber(newPhoneNumber);
    if (onChange) {
      onChange(newPhoneNumber);
    }
  };
  return (
    <div className="relative flex">
      {/* Dropdown position: Start */}
      {selectPosition === "start" && (
        <div className="absolute inset-s-0 top-0 z-10 flex h-full items-center">
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            className="h-full appearance-none rounded-s-lg border-0 border-e border-gray-200 bg-transparent bg-none py-3 ps-3.5 pe-8 leading-tight text-gray-700 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-800 dark:text-gray-400"
          >
            {countries.map((country) => (
              <option
                key={country.code}
                value={country.code}
                className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                {country.code}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 inset-e-3 flex items-center text-gray-700 dark:text-gray-400">
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Input field */}
      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        className={cn(
          "dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-3 text-start text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800",
          // In RTL, "start" is visually on the right, so swap padding sides
          isRtlLayout
            ? selectPosition === "start"
              ? "ps-4 pe-21"
              : "ps-21 pe-4"
            : selectPosition === "start"
              ? "ps-21 pe-4"
              : "ps-4 pe-21",
        )}
      />

      {/* Dropdown position: End */}
      {selectPosition === "end" && (
        <div className="absolute inset-e-0 top-0 z-10 flex h-full items-center">
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            className="h-full appearance-none rounded-e-lg border-0 border-s border-gray-200 bg-transparent bg-none py-3 ps-3.5 pe-8 leading-tight text-gray-700 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden rtl:ps-8 rtl:pe-3.5 dark:border-gray-800 dark:text-gray-400"
          >
            {countries.map((country) => (
              <option
                key={country.code}
                value={country.code}
                className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                {country.code}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 inset-e-3 flex items-center text-gray-700 rtl:inset-s-3 rtl:inset-e-auto dark:text-gray-400">
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
export default PhoneInput;

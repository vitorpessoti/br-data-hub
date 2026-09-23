"use client";
import { EnvelopeIcon } from "@/icons";
import ComponentCard from "@/components/common/component-card.component";
import Label from "@/components/form/label.component";
import PhoneInput from "@/components/form/group-input/phone-input.component";
import Input from "@/components/form/input/input-field.component";
import CopyInput from "@/modules/elements/form-elements/components/copy-input.component";
import UrlPrefixInput from "@/modules/elements/form-elements/components/url-prefix-input.component";
export default function InputGroup() {
  const countries = [
    { code: "US", label: "+1" },
    { code: "GB", label: "+44" },
    { code: "CA", label: "+1" },
    { code: "AU", label: "+61" },
  ];
  const handlePhoneNumberChange = (phoneNumber) => {
    console.log("Updated phone number:", phoneNumber);
  };
  return (
    <ComponentCard title="Grupo de campos">
      <div className="space-y-6">
        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Input
              id="email"
              placeholder="info@gmail.com"
              type="text"
              className="ps-[62px]"
            />
            <span className="absolute start-0 top-1/2 -translate-y-1/2 border-e border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <EnvelopeIcon />
            </span>
          </div>
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <PhoneInput
            selectPosition="start"
            countries={countries}
            placeholder="+1 (555) 000-0000"
            onChange={handlePhoneNumberChange}
          />
        </div>

        <div>
          <Label>Website</Label>
          <PhoneInput
            selectPosition="end"
            countries={countries}
            placeholder="+1 (555) 000-0000"
            onChange={handlePhoneNumberChange}
          />
        </div>

        <div>
          <Label>URL</Label>
          <UrlPrefixInput />
        </div>
        <div>
          <Label>Website</Label>
          <CopyInput />
        </div>
      </div>
    </ComponentCard>
  );
}

"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function IndustrySelect({
  industries,
  selectedIndustry,
  selectedSpecialization, // ✅ add this prop
  setSelectedIndustry,
  onIndustryChange,
  onSpecializationChange,
}) {
  const handleIndustrySelect = (industryId) => {
    const selected = industries.find((ind) => ind.id === industryId);
    setSelectedIndustry(selected);
    onIndustryChange(industryId); // ✅ don’t pass subIndustry here
  };

  const handleSubIndustrySelect = (subIndustry) => {
    if (!selectedIndustry) return;
    onSpecializationChange(subIndustry); // ✅ handle specialization separately
  };

  return (
    <>
      {/* Industry Dropdown */}
      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <Select
          value={selectedIndustry?.id || ""}
          onValueChange={handleIndustrySelect}
        >
          <SelectTrigger id="industry">
            <SelectValue placeholder="Select an industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Industries</SelectLabel>
              {industries.map((ind) => (
                <SelectItem key={ind.id} value={ind.id}>
                  {ind.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Subindustry Dropdown */}
      {selectedIndustry && (
        <div className="space-y-2">
          <Label htmlFor="subIndustry">Specialization</Label>
          <Select
            value={selectedSpecialization || ""} // ✅ correct variable name
            onValueChange={handleSubIndustrySelect}
          >
            <SelectTrigger id="subIndustry">
              <SelectValue placeholder="Select your specialization" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Specializations</SelectLabel>
                {selectedIndustry?.subIndustries?.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}

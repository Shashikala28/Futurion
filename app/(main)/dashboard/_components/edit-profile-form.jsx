"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateUser } from "@/actions/user";
import { toast } from "sonner";
import { industries } from "@/data/industries";
import IndustrySelect from "@/components/industry-select";

export default function EditProfileForm({ user }) {
  const router = useRouter();

  const [selectedIndustry, setSelectedIndustry] = useState(
    industries.find((ind) => ind.id === user?.industry?.split("-")[0]) || null
  );

  const [formData, setFormData] = useState({
    industry: user?.industry || "",
    subIndustry: user?.industry?.split("-")[1] || "",
    experience: user?.experience || "",
    bio: user?.bio || "",
    skills: Array.isArray(user?.skills)
      ? user.skills.join(", ")
      : user?.skills || "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleIndustryChange = (industryId, subIndustry) => {
    const formattedIndustry = `${industryId}-${subIndustry
      ?.toLowerCase()
      .replace(/ /g, "-")}`;
    setFormData({
      ...formData,
      industry: formattedIndustry,
      subIndustry,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        experience: parseInt(formData.experience, 10),
        skills: formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      await updateUser(payload);
      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      {/* <IndustrySelect
        industries={industries}
        selectedIndustry={selectedIndustry}
        setSelectedIndustry={setSelectedIndustry}
        onIndustryChange={handleIndustryChange}
      /> */}
      <IndustrySelect
        industries={industries}
        selectedIndustry={selectedIndustry}
        selectedSpecialization={formData.specialization} // ✅ added
        setSelectedIndustry={(industry) => {
          setSelectedIndustry(industry);
          setFormData((prev) => ({
            ...prev,
            industry: industry?.id || "",
            specialization: "", // reset specialization when industry changes
          }));
        }}
        onIndustryChange={(id) =>
          setFormData((prev) => ({ ...prev, industry: id }))
        }
        onSpecializationChange={(sub) =>
          setFormData((prev) => ({ ...prev, specialization: sub }))
        }
      />

      <div>
        <label className="block font-medium mb-1">Experience (in years)</label>
        <Input
          name="experience"
          type="number"
          min="0"
          max="50"
          value={formData.experience}
          onChange={handleChange}
          placeholder="e.g. 2"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Bio</label>
        <Textarea
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          placeholder="Write a short bio about yourself"
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Skills</label>
        <Input
          name="skills"
          value={formData.skills}
          onChange={handleChange}
          placeholder="e.g. React, Python, SQL"
        />
        <p className="text-sm text-muted-foreground">
          Separate multiple skills with commas
        </p>
      </div>

      <Button type="submit" className="w-full">
        Save Changes
      </Button>
    </form>
  );
}

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Skeleton } from "@/components/ui/skeleton";

interface Ministry {
  id: string;
  name: string;
}

interface DepartmentSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  showAllOption?: boolean;
}

export function DepartmentSelector({
  value,
  onValueChange,
  showAllOption = false,
}: DepartmentSelectorProps) {
  const { user } = useAuth();
  const { isAdmin, isPastor, isTesoureiro, isLider, userMinistries } = useRole();

  // Fetch ministries based on role
  const { data: ministries, isLoading } = useQuery({
    queryKey: ["ministries-for-schedules", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's church_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("church_id")
        .eq("id", user.id)
        .single();

      if (!profile?.church_id) return [];

      // If admin/pastor/tesoureiro, get all ministries
      if (isAdmin || isPastor || isTesoureiro) {
        const { data, error } = await supabase
          .from("ministries")
          .select("id, name")
          .eq("church_id", profile.church_id)
          .order("name");

        if (error) {
          console.error("Error fetching ministries:", error);
          return [];
        }

        return data as Ministry[];
      }

      // If leader, get only their assigned ministries
      if (isLider && userMinistries.length > 0) {
        const { data, error } = await supabase
          .from("ministries")
          .select("id, name")
          .in("id", userMinistries)
          .order("name");

        if (error) {
          console.error("Error fetching leader ministries:", error);
          return [];
        }

        return data as Ministry[];
      }

      // For volunteers, get ministries where they are active
      const { data: volunteerData } = await supabase
        .from("department_volunteers")
        .select("ministry_id, ministries(id, name)")
        .eq("profile_id", user.id)
        .eq("status", "active");

      if (!volunteerData) return [];

      return volunteerData
        .map((v: any) => v.ministries)
        .filter((m: any) => m !== null) as Ministry[];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />;
  }

  if (!ministries || ministries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Nenhum ministério disponível
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Selecione o ministério" />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="all">Todos os ministérios</SelectItem>
        )}
        {ministries.map((ministry) => (
          <SelectItem key={ministry.id} value={ministry.id}>
            {ministry.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

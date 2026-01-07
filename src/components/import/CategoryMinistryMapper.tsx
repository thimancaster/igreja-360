import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tag, Users } from "lucide-react";

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Ministry {
  id: string;
  name: string;
}

interface CategoryMinistryMapperProps {
  categories: Category[];
  ministries: Ministry[];
  selectedCategoryId: string | null;
  selectedMinistryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onMinistryChange: (ministryId: string | null) => void;
  disabled?: boolean;
}

export function CategoryMinistryMapper({
  categories,
  ministries,
  selectedCategoryId,
  selectedMinistryId,
  onCategoryChange,
  onMinistryChange,
  disabled = false,
}: CategoryMinistryMapperProps) {
  return (
    <Card className="mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Mapeamento Adicional (Opcional)</CardTitle>
        <CardDescription>
          Associe uma categoria e/ou ministério para todas as transações importadas.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="import-category" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Categoria
          </Label>
          <Select
            value={selectedCategoryId || "none"}
            onValueChange={(value) => onCategoryChange(value === "none" ? null : value)}
            disabled={disabled}
          >
            <SelectTrigger id="import-category">
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma categoria</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name} ({category.type === 'Receita' ? 'Receita' : 'Despesa'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="import-ministry" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ministério
          </Label>
          <Select
            value={selectedMinistryId || "none"}
            onValueChange={(value) => onMinistryChange(value === "none" ? null : value)}
            disabled={disabled}
          >
            <SelectTrigger id="import-ministry">
              <SelectValue placeholder="Selecione um ministério" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum ministério</SelectItem>
              {ministries.map((ministry) => (
                <SelectItem key={ministry.id} value={ministry.id}>
                  {ministry.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

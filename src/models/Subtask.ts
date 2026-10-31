// Categoria, data e horário são opcionais; registros antigos trazem só categoria.
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  category?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
}

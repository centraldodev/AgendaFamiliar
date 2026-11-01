import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { TaskCardList } from "../components/tasks/TaskCardList";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import type { AgendaController } from "../controllers/AgendaController";
import { useTheme } from "../styles/theme";
import { brazilHolidays } from "../utils/brazilHolidays";
import { dueStatus } from "../utils/dueStatus";
import { formatShortDate } from "../utils/formatShortDate";
import { monthGrid, monthNames } from "../utils/monthGrid";
import { today } from "../utils/today";
const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];
export function CalendarView({ controller }: { controller: AgendaController }) {
  const { s, colors } = useTheme();
  const todayDate = today();
  const [selected, setSelected] = useState(todayDate);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const { tasks } = controller.tasks;
  const weeks = useMemo(() => monthGrid(month.year, month.month), [month]);
  const holidays = useMemo(
    () => new Map(brazilHolidays(month.year).map((h) => [h.date, h])),
    [month.year],
  );
  // Inclui concluídas e puladas: o calendário mostra tudo o que caiu no dia.
  const byDay = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    for (const task of tasks)
      if (task.dueDate) map.set(task.dueDate, [...(map.get(task.dueDate) ?? []), task]);
    return map;
  }, [tasks]);
  const move = (delta: number) =>
    setMonth(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const goToday = () => {
    const now = new Date();
    setMonth({ year: now.getFullYear(), month: now.getMonth() });
    setSelected(todayDate);
  };
  const dayTasks = [...(byDay.get(selected) ?? [])].sort((a, b) =>
    (a.dueTime ?? "").localeCompare(b.dueTime ?? ""),
  );
  // O feriado do dia escolhido pode ser de outro ano que o mês exibido.
  const holiday = brazilHolidays(+selected.slice(0, 4)).find((h) => h.date === selected);
  return (
    <>
      <View style={s.card}>
        <View style={s.row}>
          <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => move(-1)} hitSlop={10}>
            <Icon name="chevron-back" size={26} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={goToday} accessibilityLabel="Voltar para hoje">
            <Text style={s.heading}>
              {monthNames[month.month]} {month.year}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => move(1)} hitSlop={10}>
            <Icon name="chevron-forward" size={26} />
          </Pressable>
        </View>
        <View style={s.calendarWeek}>
          {weekDays.map((d, i) => (
            <Text key={i} style={[s.calendarWeekDay, (i === 0) && s.calendarHolidayText]}>
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, w) => (
          <View key={w} style={s.calendarWeek}>
            {week.map((date, i) => {
              if (!date) return <View key={i} style={s.calendarCell} />;
              const items = byDay.get(date) ?? [];
              const pending = items.filter((t) => !t.completed && !t.skipped);
              const overdue = pending.some((t) => dueStatus(t) === "overdue");
              const isHoliday = holidays.has(date) && !holidays.get(date)!.optional;
              const isSelected = date === selected;
              return (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatShortDate(date)}${items.length ? `, ${items.length} tarefas` : ""}${holidays.has(date) ? `, ${holidays.get(date)!.name}` : ""}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelected(date)}
                  style={[
                    s.calendarCell,
                    date === todayDate && s.calendarToday,
                    isSelected && s.calendarSelected,
                  ]}
                >
                  <Text
                    style={[
                      s.calendarDayText,
                      (i === 0 || isHoliday) && s.calendarHolidayText,
                      isSelected && { color: colors.onPrimary },
                    ]}
                  >
                    {+date.slice(8)}
                  </Text>
                  {/* Ponto: tarefas pendentes (vermelho se alguma venceu); vazado: só encerradas. */}
                  {items.length > 0 && (
                    <View
                      style={[
                        s.calendarDot,
                        pending.length
                          ? { backgroundColor: overdue ? colors.overdue : colors.primary }
                          : { borderWidth: 1, borderColor: colors.iconMuted },
                        isSelected && pending.length > 0 && { backgroundColor: colors.onPrimary },
                      ]}
                    />
                  )}
                  {holidays.has(date) && !items.length && (
                    <View style={[s.calendarDot, { backgroundColor: colors.warning }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
        <Text style={s.footer}>
          Toque no mês para voltar a hoje. Números em vermelho: domingos e feriados.
        </Text>
      </View>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.heading}>{formatShortDate(selected)}</Text>
          {holiday && (
            <Text style={holiday.optional ? s.soonText : s.calendarHolidayText}>
              {holiday.name}
              {holiday.optional ? " (ponto facultativo)" : " (feriado nacional)"}
            </Text>
          )}
        </View>
        <Button
          title="Nova tarefa"
          icon="add"
          disabled={controller.actions.busy}
          onPress={() => controller.taskForm.openForm(undefined, selected)}
        />
      </View>
      {dayTasks.length ? (
        <TaskCardList controller={controller} tasks={dayTasks} />
      ) : (
        <Text style={s.muted}>Nenhuma tarefa neste dia.</Text>
      )}
      <MonthHolidays year={month.year} month={month.month} onSelect={setSelected} />
    </>
  );
}
// Lista dos feriados do mês exibido, para consulta rápida.
function MonthHolidays({
  year,
  month,
  onSelect,
}: {
  year: number;
  month: number;
  onSelect: (date: string) => void;
}) {
  const { s, colors } = useTheme();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const list = brazilHolidays(year).filter((h) => h.date.startsWith(prefix));
  if (!list.length) return null;
  return (
    <View style={s.card}>
      <Text style={s.label}>Feriados de {monthNames[month].toLowerCase()}</Text>
      {list.map((h) => (
        <Pressable accessibilityRole="button" key={h.date + h.name} onPress={() => onSelect(h.date)}>
          <Text style={s.muted}>
            {formatShortDate(h.date).slice(0, 5)} · {h.name}
            {h.optional ? " (ponto facultativo)" : ""}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

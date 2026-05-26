import { DataListPage } from "@/components/student/data-list-page";

export default function StudentAppointmentsPage() {
  return (
    <DataListPage title="Appointments" endpoint="/student/appointments/" emptyMessage="No appointments scheduled." />
  );
}

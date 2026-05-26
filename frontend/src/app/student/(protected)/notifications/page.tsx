import { DataListPage } from "@/components/student/data-list-page";

export default function StudentNotificationsPage() {
  return (
    <DataListPage title="Notifications" endpoint="/student/notifications/" emptyMessage="No notifications." />
  );
}

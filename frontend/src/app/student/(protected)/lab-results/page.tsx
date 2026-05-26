import { DataListPage } from "@/components/student/data-list-page";

export default function StudentLabResultsPage() {
  return (
    <DataListPage title="Lab Results" endpoint="/student/lab-results/" emptyMessage="No lab results available." />
  );
}

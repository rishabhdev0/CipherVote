import { Navigate, useParams } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import { useElection } from "../../hooks/useElection";
import { SkeletonCard } from "../../components/ui/Skeleton";
import Alert from "../../components/ui/Alert";

export default function ElectionEntryPage() {
  const { id } = useParams();
  const { data: election, isLoading } = useElection(id);

  if (isLoading)
    return (
      <PageWrapper>
        <div className="mx-auto max-w-3xl">
          <SkeletonCard rows={5} />
        </div>
      </PageWrapper>
    );

  if (!election)
    return (
      <PageWrapper>
        <div className="mx-auto max-w-3xl">
          <Alert variant="error">Election not found.</Alert>
        </div>
      </PageWrapper>
    );

  if (election.status === "RESULTS_DECLARED" || election.status === "CLOSED")
    return <Navigate to={`/elections/${id}/results`} replace />;

  if (election.status === "ACTIVE")
    return <Navigate to={`/elections/${id}/vote`} replace />;

  return <Navigate to="/elections" replace />;
}

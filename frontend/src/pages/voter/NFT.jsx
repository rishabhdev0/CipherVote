import { useEffect, useState } from "react";
import { Award, Shield, RefreshCw } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useWeb3 } from "../../context/Web3Context";
import { formatAddress } from "../../utils/formatters";

export default function Page() {
  const { voter, fetchMe } = useAuth();
  const { address, isConnected } = useWeb3();
  const [credential, setCredential] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadCredential = async () => {
    setLoading(true);
    const { data } = await api.get("/nft/mine");
    setCredential(data.data);
    await fetchMe();
    setLoading(false);
  };
  useEffect(() => {
    let live = true;
    api
      .get("/nft/mine")
      .then((r) => live && setCredential(r.data.data))
      .catch(() => live && setCredential(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);
  const tier = credential?.tier || voter?.nftTier || "BRONZE";
  const registeredWallet = voter?.walletAddress;
  const walletMismatch =
    isConnected &&
    registeredWallet &&
    address?.toLowerCase() !== registeredWallet.toLowerCase();
  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-semibold text-5xl text-slate-950">
            MY <span className="text-blue-700">NFT CREDENTIAL</span>
          </h1>
          <p className="text-sm text-slate-500">
            Non-transferable voter credential status from your profile and NFT
            service.
          </p>
        </div>
        {walletMismatch && (
          <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red">
            You are viewing the logged-in voter credential, but MetaMask is
            connected to {formatAddress(address)}. This voter is registered with{" "}
            {formatAddress(registeredWallet)}.
          </div>
        )}
        <div className="bg-white border border-slate-200 p-6">
          {loading ? (
            <p className="text-slate-500">Loading credential...</p>
          ) : (
            <div className="grid md:grid-cols-[160px_1fr] gap-6 items-center">
              <div className="aspect-square border border-blue-600 bg-blue-600/10 flex items-center justify-center">
                <Award size={72} className="text-blue-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-green" />
                  <span className="text-xs font-bold text-green">
                    {voter?.status || "UNKNOWN"}
                  </span>
                </div>
                <h2 className="font-semibold text-4xl text-slate-950">
                  {tier}
                </h2>
                <p className="text-sm text-slate-500">
                  Token ID:{" "}
                  {credential?.tokenId || voter?.nftTokenId || "Not minted"}
                </p>
                <p className="text-sm text-slate-500">
                  Participated: {credential?.electionsParticipated ?? 0}
                </p>
                <p className="text-sm text-slate-500">
                  Eligible elections: {credential?.electionsEligible ?? 0}
                </p>
                <button
                  onClick={() =>
                    loadCredential().catch(() => setLoading(false))
                  }
                  className="btn-ghost btn-sm mt-4"
                >
                  <RefreshCw size={13} />
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

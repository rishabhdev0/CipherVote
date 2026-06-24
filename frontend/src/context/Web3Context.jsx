import { createContext, useContext, useState, useCallback } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { CHAIN_ID } from "../utils/constants";
const Web3Context = createContext(null);
export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not installed");
      return null;
    }
    setConnecting(true);
    try {
      const prov = new ethers.BrowserProvider(window.ethereum);
      await prov.send("eth_requestAccounts", []);
      const sign = await prov.getSigner();
      const addr = await sign.getAddress();
      const network = await prov.getNetwork();
      setProvider(prov);
      setSigner(sign);
      setAddress(addr);
      setChainId(Number(network.chainId));
      if (Number(network.chainId) !== CHAIN_ID)
        toast.error("Wrong network - switch to local/Sepolia");
      window.ethereum.on("accountsChanged", (accs) => {
        if (accs.length === 0) {
          setProvider(null);
          setSigner(null);
          setAddress(null);
        } else setAddress(accs[0]);
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
      return { address: addr, signer: sign, provider: prov };
    } catch (e) {
      toast.error("Failed to connect wallet");
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);
  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
  }, []);
  const signMessage = useCallback(
    async (msg) => {
      if (!signer) throw new Error("Not connected");
      return signer.signMessage(msg);
    },
    [signer],
  );
  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        address,
        chainId,
        connecting,
        isConnected: !!address,
        isRightChain: chainId === CHAIN_ID,
        connect,
        disconnect,
        signMessage,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}
export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 outside provider");
  return ctx;
};

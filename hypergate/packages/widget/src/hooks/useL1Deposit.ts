import { useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useAccount } from 'wagmi';
import { parseAbi } from 'viem';
import { CHAINS, CONTRACTS } from '../config/constants';

const ERC20_ABI = parseAbi([
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)'
]);

export function useL1Deposit() {
    const { switchChainAsync } = useSwitchChain();
    const { chainId } = useAccount();
    const { writeContractAsync, data: hash, isPending: isWritePending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const depositToL1 = async (amount: bigint) => {
        try {
            // 1. Ensure we are on HyperEVM
            if (chainId !== CHAINS.HYPEREVM.id) {
                await switchChainAsync({ chainId: CHAINS.HYPEREVM.id });
            }

            // 2. Send USDC to Asset Bridge Precompile
            const txHash = await writeContractAsync({
                address: CONTRACTS.USDC_HYPEREVM as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'transfer',
                args: [CONTRACTS.ASSET_BRIDGE as `0x${string}`, amount],
            });

            return txHash;

        } catch (error) {
            console.error('L1 Deposit Failed:', error);
            throw error;
        }
    };

    return {
        depositToL1,
        isLoading: isWritePending || isConfirming,
        isSuccess,
        hash
    };
}

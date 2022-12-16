import { Signer } from "ethers";
import { CouncilContext } from "src/context";
import { TransactionOptions } from "src/datasources/ContractDataSource";
import {
  GrantData,
  VestingVaultContractDataSource,
} from "src/datasources/VotingVault/VestingVaultContractDataSource";
import { Token } from "src/models/Token";
import { Voter } from "src/models/Voter";
import { sumStrings } from "src/utils/sumStrings";
import { VotingVault, VotingVaultOptions } from "./VotingVault";

interface VestingVaultOptions extends VotingVaultOptions {
  dataSource?: VestingVaultContractDataSource;
}

/**
 * A VotingVault that gives voting power for receiving grants and applies a
 * multiplier on unvested tokens to reduce their voting power.
 */
export class VestingVault extends VotingVault<VestingVaultContractDataSource> {
  constructor(
    address: string,
    context: CouncilContext,
    options?: VestingVaultOptions,
  ) {
    super(address, context, {
      ...options,
      name: options?.name ?? "Vesting Vault",
      dataSource:
        options?.dataSource ??
        context.registerDataSource(
          { address },
          new VestingVaultContractDataSource(address, context),
        ),
    });
  }

  /**
   * Get the associated token for this vault.
   */
  async getToken(): Promise<Token> {
    const address = await this.dataSource.getToken();
    return new Token(address, this.context);
  }

  /**
   * Get the grant data for a given address.
   */
  getGrant(address: string): Promise<GrantData> {
    return this.dataSource.getGrant(address);
  }

  /**
   * Get all participants that have voting power in this vault.
   * @param fromBlock The block number to start searching for voters from.
   * @param toBlock The block number to stop searching for voters at.
   */
  async getVoters(fromBlock?: number, toBlock?: number): Promise<Voter[]> {
    const votersWithPower = await this.dataSource.getAllVotersWithPower(
      fromBlock,
      toBlock,
    );
    return votersWithPower.map(
      ({ address }) => new Voter(address, this.context),
    );
  }

  /**
   * Get the sum of voting power held by all voters in this vault.
   * @param fromBlock The block number to start searching for voters from.
   * @param toBlock The block number to stop searching for voters at.
   */
  async getTotalVotingPower(
    fromBlock?: number,
    toBlock?: number,
  ): Promise<string> {
    const allVotersWithPower = await this.dataSource.getAllVotersWithPower(
      fromBlock,
      toBlock,
    );
    return sumStrings(allVotersWithPower.map(({ power }) => power));
  }

  /**
   * Get the number of blocks before the delegation history is forgotten. Voting
   * power from this vault can't be used on proposals that are older than the
   * stale block lag.
   */
  getStaleBlockLag(): Promise<number> {
    return this.dataSource.getStaleBlockLag();
  }

  /**
   * Get the voting power for a given address at a given block without
   * accounting for the stale block lag.
   */
  async getHistoricalVotingPower(
    address: string,
    atBlock?: number,
  ): Promise<string> {
    return this.dataSource.getHistoricalVotingPower(
      address,
      atBlock ?? (await this.context.provider.getBlockNumber()),
    );
  }

  /**
   * Get the current delegate of a given address.
   */
  async getDelegate(address: string): Promise<Voter> {
    const delegateAddress = await this.dataSource.getDelegate(address);
    return new Voter(delegateAddress, this.context);
  }

  /**
   * Get all voters delegated to a given address in this vault.
   */
  async getDelegatorsTo(address: string, atBlock?: number): Promise<Voter[]> {
    const delegators = await this.dataSource.getDelegatorsTo(address, atBlock);
    return delegators.map(({ address }) => new Voter(address, this.context));
  }

  /**
   * Change current delegate.
   * @param signer The Signer of the address delegating.
   * @param delegate The address to delegate to.
   * @returns The transaction hash.
   */
  changeDelegate(
    signer: Signer,
    delegate: string,
    options?: TransactionOptions,
  ): Promise<string> {
    return this.dataSource.changeDelegate(signer, delegate, options);
  }

  /**
   * Claim a grant and withdraw the tokens.
   * @param signer The Signer of the wallet with a grant to claim.
   * @returns The transaction hash.
   */
  claim(signer: Signer, options?: TransactionOptions): Promise<string> {
    return this.dataSource.claim(signer, options);
  }
}

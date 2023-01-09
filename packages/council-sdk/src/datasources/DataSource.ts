import { CouncilContext } from "src/context";

/**
 * The base DataSource interface which simply requires a context instance.
 * @category Data Sources
 */
export interface DataSource {
  context: CouncilContext;
}

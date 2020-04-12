import XApiClient from 'src/brokers/xtb/x_api_client';
import {Constants} from 'src/brokers/xtb/x_api_constants';

/**
 * @namespace
 * @property {Constants} Constants
 * @property {XApiClient} XApiClient
 */
const XApi = {Constants: Constants, Client: XApiClient};
export default XApi;

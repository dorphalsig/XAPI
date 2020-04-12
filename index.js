import XApiClient from 'src/brokers/xtb/x_api_client';
import xapi_constants from 'src/brokers/xtb/xapi_constants';

/**
 * @typedef XApi
 * @type {Object}
 * @property {XApiClient} Client
 * @property {xapi_constants} Constants
 */
const XApi = {Client: XApiClient, Constants: xapi_constants};
export default XApi;

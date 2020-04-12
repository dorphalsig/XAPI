export default XApi;
declare namespace XApi {
    export {defaultExport as Constants};
    export {XApiClient as Client};
}
import defaultExport from "./src/brokers/xtb/x_api_constants";
import XApiClient from "./src/brokers/xtb/x_api_client";

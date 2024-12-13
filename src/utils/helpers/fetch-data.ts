import axios from "axios";
import JSONBigInt from "json-bigint";

export const fetchData = async (url: string): Promise<any> => {
  const response = await axios.get(url, {
    // Prevent axios from automatically parsing JSON
    transformResponse: (data) => data,
  });
  if (response.data) {
    // Use JSON-bigint to parse the response
    return JSONBigInt.parse(response.data);
  }
  throw new Error("No data received");
};

import axios from "axios";

export const fetchData = async (url: string): Promise<any> => {
  const response = await axios.get(url);
  if (response.data) {
    return response.data;
  }
  throw new Error("No data received");
};

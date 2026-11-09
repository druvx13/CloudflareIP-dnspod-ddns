const moment = require("moment");
const axios = require("axios");
// Configuration.
const { secretId, secretKey, Domain, SubDomain } = require("./config");
const tencentcloud = require("tencentcloud-sdk-nodejs-dnspod");
// Update the selected Cloudflare IP.
const updateCloudflareIp = async () => {
  const res = await axios.get("https://api.4ce.cn/api/bestCFIP");
  if (!res.data.success) {
    console.log("\x1b[91m%s\x1b[0m", "Failed to update the selected Cloudflare IP.");
    return "Failed to update the selected Cloudflare IP.";
  }
  return await updateTencentDns(res.data.data);
};

// Update DNSPod records.
const DnspodClient = tencentcloud.dnspod.v20210323.Client;
const TENCENT_DNSPOD_clientConfig = {
  credential: { secretId, secretKey },
  profile: { httpProfile: { endpoint: "dnspod.tencentcloudapi.com" } }
};
const updateTencentDns = async IP_DATA => {
  // Query the domain's record list.
  const client = new DnspodClient(TENCENT_DNSPOD_clientConfig);
  let _domainList = {};
  try {
    _domainList = await client.DescribeRecordList({ Domain });
  } catch (error) {
    _domainList = { RecordList: [] };
  }

  // Filter records for the supported DNSPod line types.
  const LineTypeArr = ["\u9ED8\u8BA4", "\u7535\u4FE1", "\u8054\u901A", "\u79FB\u52A8"];
  const DnsPodDomainList = _domainList.RecordList.filter(i => LineTypeArr.includes(i.Line) && i.Name == SubDomain);

  // Select the lowest-latency IPv4 address.
  const CM_IP_V4 = IP_DATA.v4.CM.reduce((minItem, currentItem) => {
    return currentItem.latency < minItem.latency ? currentItem : minItem;
  }, IP_DATA.v4.CM[0]);
  const CU_IP_V4 = IP_DATA.v4.CU.reduce((minItem, currentItem) => {
    return currentItem.latency < minItem.latency ? currentItem : minItem;
  }, IP_DATA.v4.CU[0]);
  const CT_IP_V4 = IP_DATA.v4.CT.reduce((minItem, currentItem) => {
    return currentItem.latency < minItem.latency ? currentItem : minItem;
  }, IP_DATA.v4.CT[0]);
  const DNS_DATA_V4 = {
    "\u79FB\u52A8": CM_IP_V4.ip,
    "\u8054\u901A": CM_IP_V4.ip,
    "\u7535\u4FE1": CU_IP_V4.ip,
    "\u9ED8\u8BA4": CT_IP_V4.ip
  };

  // Select the lowest-latency IPv6 address.
  const CM_IP_V6 = IP_DATA.v6.CM.reduce((minItem, currentItem) => {
    return currentItem.latency < minItem.latency ? currentItem : minItem;
  }, IP_DATA.v6.CM[0]);
  const CU_IP_V6 = IP_DATA.v6.CU.reduce((minItem, currentItem) => {
    return currentItem.latency < minItem.latency ? currentItem : minItem;
  }, IP_DATA.v6.CU[0]);
  const CT_IP_V6 = IP_DATA.v6.CT.reduce((minItem, currentItem) => {
    return currentItem.latency < minItem.latency ? currentItem : minItem;
  }, IP_DATA.v6.CT[0]);
  const DNS_DATA_V6 = {
    "\u79FB\u52A8": CM_IP_V6.ip,
    "\u8054\u901A": CM_IP_V6.ip,
    "\u7535\u4FE1": CU_IP_V6.ip,
    "\u9ED8\u8BA4": CT_IP_V6.ip
  };

  // Replace each record with the selected IP.
  DnsPodDomainList.forEach(async i => {
    try {
      const res = await client.ModifyRecord({ Domain, RecordType: i.Type, RecordLine: "", RecordLineId: i.LineId, Value: i.Type == "A" ? DNS_DATA_V4[i.Line] : DNS_DATA_V6[i.Line], RecordId: i.RecordId, SubDomain });
      console.log(res);
    } catch (error) {
      console.log(error);
    }
  });
  return `${moment().format("YYYY.MM.DD HH:mm:ss")} - DNSPod records updated successfully.`;
};

module.exports = { updateCloudflareIp };

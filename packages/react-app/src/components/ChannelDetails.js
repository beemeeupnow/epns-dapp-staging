import React from "react";
import moment from "moment";
import styled from "styled-components";
import { useSelector } from "react-redux";
import ChannelsDataStore from "singletons/ChannelsDataStore";
import { ALLOWED_CORE_NETWORK } from "pages/Home";
import { useWeb3React } from "@web3-react/core";
import { postReq } from "api";
const DATE_FORMAT = "DD/MM/YYYY";
export default function ChannelDetails() {
    const { channelDetails, canVerify } = useSelector((state) => state.admin);
    const { CHANNEL_ACTIVE_STATE, CHANNNEL_DEACTIVATED_STATE } = useSelector(
        (state) => state.channels
    );
    const [verifyingChannel, setVerifyingChannel] = React.useState([]);
    const [creationDate, setCreationDate] = React.useState("");
    const [ethAliasAccount, setEthAliasAccount] = React.useState(null);
    const [aliasVerified, setAliasVerified] = React.useState(null); // null means error, false means unverified and true means verified
    const { channelState } = channelDetails;
    const channelIsActive = channelState === CHANNEL_ACTIVE_STATE;
    const channelIsDeactivated = channelState === CHANNNEL_DEACTIVATED_STATE;
    const { account, library, chainId } = useWeb3React();
    const onCoreNetwork = ALLOWED_CORE_NETWORK === chainId;

    React.useEffect(() => {
        if (!channelDetails || !canVerify) return;
        (async function () {
            let channelJson =
                await ChannelsDataStore.instance.getChannelJsonAsync(
                    channelDetails.verifiedBy
                );
            setVerifyingChannel(channelJson);
        })();
    }, [channelDetails, canVerify]);

    React.useEffect(() => {
        if (!channelDetails) return;
        (async function () {
            const bn = channelDetails.channelStartBlock.toString();
            const block = await library.getBlock(+bn);
            const date = moment(block?.timestamp * 1000); //convert from millisecs
            setCreationDate(block ? date.format(DATE_FORMAT) : "");
        })();
    }, [channelDetails]);

    React.useEffect(() => {
        if (!onCoreNetwork) return;
        (async function () {
            await postReq("/channels/get_alias_details", {
                channel: account,
                op: "read",
            }).then(async ({ data }) => {
                const aliasAccount = data;
                console.log(aliasAccount);
                if (aliasAccount.aliasAddress) {
                    const { aliasAddress } = aliasAccount;
                    console.log(aliasAddress);
                    setEthAliasAccount(aliasAddress);
                    await postReq("/channels/get_alias_verification_status", {
                        aliasAddress: aliasAddress,
                        op: "read",
                    }).then(({ data }) => {
                        // if it returns undefined then we need to let them know to verify their channel
                        if (!data) {
                            setAliasVerified(false);
                            return;
                        }
                        const { status } = data;
                        setAliasVerified(status || false);
                        return data;
                    });
                }
            });
        })();
    }, [account, chainId]);

    return (
        <ChannelDetailsWrapper>
            <SectionTop>
                <ImageSection src={channelDetails.icon}></ImageSection>

                <Details>
                    <ChannelName>
                        {channelDetails.name}
                        {canVerify && (
                            <VerifyImage src="/verify.png"></VerifyImage>
                        )}
                    </ChannelName>
                    <ChanneStateText active={channelIsActive}>
                        {channelIsActive
                            ? "ACTIVE"
                            : channelIsDeactivated
                            ? "DEACTIVATED"
                            : "BLOCKED"}
                    </ChanneStateText>
                    <Subscribers>
                        <img src="/people.svg"></img>
                        <SubscribersCount>
                            {channelDetails.subscribers.length}
                        </SubscribersCount>
                    </Subscribers>
                </Details>
            </SectionTop>

            <SectionDes>{channelDetails.info}</SectionDes>
            {aliasVerified === false && (
                <span
                    style={{ fontSize: "16px", fontWeight: 500, color: "red" }}
                >
                    Please Verify Alias on Polygon
                </span>
            )}
            <SectionDate>
                {canVerify && (
                    <Verified>
                        <span>verified by:</span>

                        <VerifyingIcon
                            src={verifyingChannel.icon}
                        ></VerifyingIcon>
                        <VerifyingName>{verifyingChannel.name}</VerifyingName>
                    </Verified>
                )}

                <Date>
                    <span>created on:</span>
                    <span style={{ marginLeft: "10px" }}>{creationDate}</span>
                </Date>
            </SectionDate>

            <hr />
        </ChannelDetailsWrapper>
    );
}

const ChannelDetailsWrapper = styled.div`
    padding: 30px;
    padding-bottom: 0;
`;

const SectionTop = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 30px;
`;

const ImageSection = styled.img`
    width: 120px;
    height: 120px;
    border-radius: 50%;
    margin-right: 20px;
`;
const VerifyImage = styled.img`
    width: 20px;
    height: 25px;
    margin-top: auto;
    margin-bottom: auto;
    margin-left: 8px;
`;

const VerifyingIcon = styled.img`
    height: 20px;
    width: 20px;
    border-radius: 50%;
    margin-left: 6px;
    margin-right: 5px;
`;

const VerifyingName = styled.div``;

const Subscribers = styled.div`
    height: fit-content;
    display: flex;
    align-items: center;
`;

const ActiveIcon = styled.span`
    width: 8px;
    height: 8px;
    background: #57c255;
    border-radius: 50%;
`;

const ChanneStateText = styled.span`
    color: #57c255;
    font-family: Source Sans Pro;
    font-style: normal;
    font-weight: normal;
    font-size: 18px;
    line-height: 23px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${(props) => (props.active ? "#57c255" : "red")};
    margin-bottom: 8px;
    display: flex;
    align-items: center;

    ${(props) =>
        props.active &&
        `
        &::after {
            width:8px;
            height: 8px;
            background: #57c255;
            border-radius: 50%;
            content: "";
            display: inline-flex;
            align-items: center;
            margin-left: 6px;
        }
    `}
`;

const SubscribersCount = styled.span`
    margin-left: 5px;
    padding-left: 8px;
    padding-right: 8px;
    height: 16px;
    background: #35c5f3;
    border-radius: 10px;
    font-weight: 600;
    font-size: 12px;
    line-height: 17px;
    display: inline-block;
    color: #ffffff;
`;

const Details = styled.div`
    display: flex;
    flex-direction: column;
`;
const SectionLine = styled.div`
    margin-left: 30px;
    margin-right: 30px;
`;

const Date = styled.div`
    display: flex;
    flex-direction: row;
    width: 240px;
    color: #674c9f;
`;

const Verified = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;

    & > span {
        color: #ec008c;
        fontsize: 1em;
        fontweight: bolder;
    }
`;

const ChannelName = styled.div`
    display: flex;
    flex-direction: row;

    font-family: Source Sans Pro;
    font-style: normal;
    font-weight: normal;
    font-size: 30px;
    line-height: 38px;
    margin-right: 8px;
    text-transform: capitalize;
    color: #e20880;
`;

const SectionDate = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    font-style: normal;
    font-weight: 600;
    font-size: 16px;
    line-height: 25px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 30px;
`;

const SectionDes = styled.div`
    font-family: Source Sans Pro;
    font-style: normal;
    font-weight: 300;
    font-size: 24px;
    line-height: 30px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #000000;
    margin-bottom: 40px;
`;

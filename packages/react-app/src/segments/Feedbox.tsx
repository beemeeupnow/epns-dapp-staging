import React from "react";
import styled from "styled-components";
import Loader from "react-loader-spinner";
import { Waypoint } from "react-waypoint";
import { useWeb3React } from "@web3-react/core";
import { useSelector, useDispatch } from "react-redux";
import { envConfig } from "@project/contracts";
import DisplayNotice from "components/DisplayNotice";
import { postReq } from "api";
import SpamBox from "./spam";
import {
    api,
    utils,
    NotificationItem,
} from "@epnsproject/frontend-sdk-staging";
import {
    addPaginatedNotifications,
    incrementPage,
    setFinishedFetching,
    resetState,
    updateTopNotifications,
} from "redux/slices/notificationSlice";

const NOTIFICATIONS_PER_PAGE = 100000;

// Create Header
function Feedbox() {
    const dispatch = useDispatch();
    const { account } = useWeb3React();
    const { notifications, page, finishedFetching, toggle } = useSelector(
        (state: any) => state.notifications
    );
    
    const [filteredNotifications , setFilteredNotifications] = React.useState([]);
    const [filter , setFilter] = React.useState(false);
    const [bgUpdateLoading, setBgUpdateLoading] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [currentTab, setCurrentTab] = React.useState("inbox");

    //                                                          default low date        default high date
    const filterNotifications = async (query , channels , startDate = "2000-01-01" , endDate = "9999-99-99") => {
        if(loading)return;
        setLoading(true);
        setFilter(!filter);
        var Filter = {
            channels : channels , 
            date : {lowDate : startDate , highDate : endDate}
        };
        if(channels.length == 0)delete Filter.channels;

        
        setFilteredNotifications([]);
        if(notifications.length >= NOTIFICATIONS_PER_PAGE){
            try {
                const {count , results} = await postReq("/feeds/search", {
                    subscriber : account,
                    searchTerm: query,
                    filter: Filter,
                    isSpam: 0,
                    page: 1,
                    pageSize: 5,
                    op: "read"
                });
                const parsedResponse = utils.parseApiResponse(results);
                setFilteredNotifications([parsedResponse]);
            }
            catch (err) {
                console.log(err);
            }
        }
        else{
            const regex = new RegExp(`^.*?${query.toLowerCase()}.*?$`);
            let filterNotif = [];
            for(const notif of notifications){
                if(
                    ( (Filter.channels === undefined ?  true : (Filter.channels.includes(notif.channel)))&&
                notif.date >= startDate && notif.date <= endDate
                && await notif.message.toLowerCase().match(regex)!==null )
                )
                filterNotif.push(notif);
            }
            setFilteredNotifications(filterNotif);
        }
        setLoading(false);
    }
    const loadNotifications = async () => {
        if (loading || finishedFetching) return;
        setLoading(true);
        try {
            const { count, results } = await api.fetchNotifications(
                account,
                NOTIFICATIONS_PER_PAGE,
                page,
                envConfig.apiUrl
            );
            const parsedResponse = utils.parseApiResponse(results);
            dispatch(addPaginatedNotifications(parsedResponse));
            if (count === 0) {
                dispatch(setFinishedFetching());
            }
        } catch (err) {
            console.log(err);
        } finally {
            setLoading(false);
        }
    };
    const fetchLatestNotifications = async () => {
        if (loading || bgUpdateLoading) return;
        setBgUpdateLoading(true);
        setLoading(true);
        try {
            const { count, results } = await api.fetchNotifications(
                account,
                NOTIFICATIONS_PER_PAGE,
                1,
                envConfig.apiUrl
            );
            if (!notifications.length) {
                dispatch(incrementPage());
            }
            const parsedResponse = utils.parseApiResponse(results);
            const map1 = new Map();
            const map2 = new Map();
            results.forEach( each => {
                map1.set(each.payload.data.sid , each.epoch.substring(0 ,10));
                map2.set(each.payload.data.sid , each.channel);
            })
            parsedResponse.forEach( each => {
                each.date = map1.get(each.sid);
                each.channel = map2.get(each.sid);
            })
            dispatch(
                updateTopNotifications({
                    notifs: parsedResponse,
                    pageSize: NOTIFICATIONS_PER_PAGE,
                })
            );
            if (count === 0) {
                dispatch(setFinishedFetching());
            }
        } catch (err) {
            console.log(err);
        } finally {
            setBgUpdateLoading(false);
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (account && currentTab === "inbox") {
            fetchLatestNotifications();
        }
    }, [account, currentTab]);

    React.useEffect(() => {
        fetchLatestNotifications();
    }, [toggle]);

    //function to query more notifications
    const handlePagination = async () => {
        loadNotifications();
        dispatch(incrementPage());
    };

    const showWayPoint = (index: any) => {
        return (
            Number(index) === notifications.length - 1 &&
            !finishedFetching &&
            !bgUpdateLoading
        );
    };
    const [clicked, setClicked] = React.useState(false);

    // Render
    return (
        <FullWidth>
            <Wrapper>
                {bgUpdateLoading && (
                    <div style={{ marginTop: "10px", marginLeft: "21px" }}>
                        <Loader
                            type="Oval"
                            color="#35c5f3"
                            height={40}
                            width={40}
                        />
                    </div>
                )}
                <button onClick={()=>filterNotifications("FCM" , [] )}>Click Here</button>
                <ControlButtonBack
                    active={currentTab == "inbox"}
                    onClick={() => {
                        setCurrentTab("inbox");
                        setClicked(false);
                    }}
                >
                    {/* Inbox */}
                    <img src="./arrow_back.png" />
                    <img style={{ marginLeft: "15px" }} src="./svg/INBOX.svg" />
                    {/* <ControlText color="#35C5F3">INBOX</ControlText> */}
                </ControlButtonBack>

                <ControlButton
                    active={currentTab == "spambox"}
                    onClick={() => {
                        setCurrentTab("spambox");
                        setClicked(true);
                    }}
                    spam
                >
                    <ControlImage
                        active={currentTab == "spambox"}
                        src="./spam-icon.png"
                    />
                </ControlButton>
            </Wrapper>

            {currentTab == "spambox" ? (
                <SpamBox currentTab={currentTab} />
            ) : (
                <Container>
                    {notifications && (
                        <Items id="scrollstyle-secondary">
                            {(filter? filteredNotifications : notifications).map((oneNotification, index) => {
                                const {
                                    cta,
                                    title,
                                    message,
                                    app,
                                    icon,
                                    image,
                                    url,
                                    blockchain,
                                } = oneNotification;

                                // render the notification item
                                return (
                                    <div key={`${message}+${title}`}>
                                        {showWayPoint(index) && (
                                            <Waypoint
                                                onEnter={() =>
                                                    handlePagination()
                                                }
                                            />
                                        )}
                                        <NotificationItem
                                            notificationTitle={title}
                                            notificationBody={message}
                                            cta={cta}
                                            app={app}
                                            icon={icon}
                                            url={url}
                                            image={image}
                                            chainName={blockchain}
                                        />
                                    </div>
                                );
                            })}
                        </Items>
                    )}
                    {loading && !bgUpdateLoading && (
                        <Loader
                            type="Oval"
                            color="#35c5f3"
                            height={40}
                            width={40}
                        />
                    )}
                    {(!notifications.length || (filter && !filteredNotifications.length)) && !loading && (
                        <CenteredContainerInfo>
                            <DisplayNotice
                                title="You currently have no notifications, try subscribing to some channels."
                                theme="third"
                            />
                        </CenteredContainerInfo>
                    )}
                </Container>
            )}
        </FullWidth>
    );
}

// const Controls = styled.div`
//   flex: 0;
//   display: flex;
//   flex-direction: row;
//   display: flex;
//   flex-wrap: wrap;
//   justify-content: space-between;
// `;

const ControlButtonBack = styled.div`
    flex: 1 1 21%;
    height: 20px;
    min-width: 70px;
    background: #fff;
    margin-top: 10px;
    margin-left: 27px;

    overflow: hidden;
    background: #fafafa;

    display: flex;
    visibility: ${(props) => (props.active ? "hidden" : "")};

    // opacity: ${(props) => (props.active ? "1" : "0.4")};

    &:hover {
        opacity: 0.9;
        cursor: pointer;
        pointer: hand;
    }
`;

const ControlButton = styled.div`
    display: flex;
    height: 44px;
    min-width: 40px;
    border-radius: 10px;
    margin-right: 30px;
    margin-bottom: 20px;

    // opacity: ${(props) => (props.active ? "1" : "0.4")};
    // background-color: ${(props) => (props.active ? "#E20880" : "")};

    &:hover {
        opacity: 0.9;
        cursor: pointer;
        pointer: hand;
    }
`;

const ControlImage = styled.img`
    height: 40px;
    width: 40px;
`;

const ControlText = styled.div`
    font-size: 20px;
    font-weight: 400;
    margin-left: 15px;
    opacity: ${(props) => (props.active ? "1" : "0.75")};
`;

const FullWidth = styled.div`
    width: 100%;
`;
const Wrapper = styled.div`
    display: flex;
    flex-direction: row;
    padding-top: 20px;
    background: #fafafa;
`;

const EmptyWrapper = styled.div`
    padding-top: 50px;
    padding-bottom: 50px;
`;
const CenteredContainerInfo = styled.div`
    padding: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const Items = styled.div`
    display: block;
    align-self: stretch;
    padding: 10px 20px;
    overflow-y: scroll;
    background: #fafafa;
`;
// css styles
const Container = styled.div`
    display: flex;
    flex: 1;
    flex-direction: column;

    font-weight: 200;
    align-content: center;
    align-items: center;
    justify-content: center;
    max-height: 100vh;

    // padding: 20px;
    // font-size: 16px;
    // display: flex;
    // font-weight: 200;
    // align-content: center;
    // align-items: center;
    // justify-content: center;
    // width: 100%;
    // min-height: 40vh;
`;

// Export Default
export default Feedbox;

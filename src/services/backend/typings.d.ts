declare namespace API {
  type addTitleToUserUsingPOSTParams = {
    /** titleId */
    titleId: number;
    /** userId */
    userId: number;
  };

  type AvatarFrame = {
    createTime?: string;
    frameId?: number;
    isDelete?: number;
    name?: string;
    points?: number;
    updateTime?: string;
    url?: string;
  };

  type AvatarFrameQueryRequest = {
    current?: number;
    id?: number;
    pageSize?: number;
    searchText?: string;
    sortField?: string;
    sortOrder?: string;
  };

  type AvatarFrameVO = {
    hasOwned?: boolean;
    id?: number;
    name?: string;
    points?: number;
    url?: string;
  };

  type BaseResponseBoolean_ = {
    code?: number;
    data?: boolean;
    message?: string;
  };

  type BaseResponseBossBattleInfoVO_ = {
    code?: number;
    data?: BossBattleInfoVO;
    message?: string;
  };

  type BaseResponseCosCredentialVo_ = {
    code?: number;
    data?: CosCredentialVo;
    message?: string;
  };

  type BaseResponseDonationRecordsVO_ = {
    code?: number;
    data?: DonationRecordsVO;
    message?: string;
  };

  type BaseResponseDrawGuessVO_ = {
    code?: number;
    data?: DrawGuessVO;
    message?: string;
  };

  type BaseResponseDrawRoomVO_ = {
    code?: number;
    data?: DrawRoomVO;
    message?: string;
  };

  type BaseResponseHeroRankingVO_ = {
    code?: number;
    data?: HeroRankingVO;
    message?: string;
  };

  type BaseResponseHeroVO_ = {
    code?: number;
    data?: HeroVO;
    message?: string;
  };

  type BaseResponseInt_ = {
    code?: number;
    data?: number;
    message?: string;
  };

  type BaseResponseItemInstances_ = {
    code?: number;
    data?: ItemInstances;
    message?: string;
  };

  type BaseResponseItemInstanceVO_ = {
    code?: number;
    data?: ItemInstanceVO;
    message?: string;
  };

  type BaseResponseItemTemplateVO_ = {
    code?: number;
    data?: ItemTemplateVO;
    message?: string;
  };

  type BaseResponseListAvatarFrame_ = {
    code?: number;
    data?: AvatarFrame[];
    message?: string;
  };

  type BaseResponseListBattleResultVO_ = {
    code?: number;
    data?: BattleResultVO[];
    message?: string;
  };

  type BaseResponseListBossChallengeRankingVO_ = {
    code?: number;
    data?: BossChallengeRankingVO[];
    message?: string;
  };

  type BaseResponseListBossVO_ = {
    code?: number;
    data?: BossVO[];
    message?: string;
  };

  type BaseResponseListDrawGuessVO_ = {
    code?: number;
    data?: DrawGuessVO[];
    message?: string;
  };

  type BaseResponseListDrawRoomVO_ = {
    code?: number;
    data?: DrawRoomVO[];
    message?: string;
  };

  type BaseResponseListHeroRankingVO_ = {
    code?: number;
    data?: HeroRankingVO[];
    message?: string;
  };

  type BaseResponseListHotPostVO_ = {
    code?: number;
    data?: HotPostVO[];
    message?: string;
  };

  type BaseResponseListNewUserDataWebVO_ = {
    code?: number;
    data?: NewUserDataWebVO[];
    message?: string;
  };

  type BaseResponseListPetRankVO_ = {
    code?: number;
    data?: PetRankVO[];
    message?: string;
  };

  type BaseResponseListSimpleHeroVO_ = {
    code?: number;
    data?: SimpleHeroVO[];
    message?: string;
  };

  type BaseResponseListUndercoverPlayerDetailVO_ = {
    code?: number;
    data?: UndercoverPlayerDetailVO[];
    message?: string;
  };

  type BaseResponseListUndercoverRoomVO_ = {
    code?: number;
    data?: UndercoverRoomVO[];
    message?: string;
  };

  type BaseResponseListUndercoverVoteVO_ = {
    code?: number;
    data?: UndercoverVoteVO[];
    message?: string;
  };

  type BaseResponseListUserChatResponse_ = {
    code?: number;
    data?: UserChatResponse[];
    message?: string;
  };

  type BaseResponseListUserTitle_ = {
    code?: number;
    data?: UserTitle[];
    message?: string;
  };

  type BaseResponseListVO_ = {
    code?: number;
    data?: VO[];
    message?: string;
  };

  type BaseResponseLoginUserVO_ = {
    code?: number;
    data?: LoginUserVO;
    message?: string;
  };

  type BaseResponseLong_ = {
    code?: number;
    data?: number;
    message?: string;
  };

  type BaseResponseMockInterview_ = {
    code?: number;
    data?: MockInterview;
    message?: string;
  };

  type BaseResponseOtherUserPetVO_ = {
    code?: number;
    data?: OtherUserPetVO;
    message?: string;
  };

  type BaseResponsePageAvatarFrameVO_ = {
    code?: number;
    data?: PageAvatarFrameVO_;
    message?: string;
  };

  type BaseResponsePageCommentNodeVO_ = {
    code?: number;
    data?: PageCommentNodeVO_;
    message?: string;
  };

  type BaseResponsePageCommentVO_ = {
    code?: number;
    data?: PageCommentVO_;
    message?: string;
  };

  type BaseResponsePageDonationRecords_ = {
    code?: number;
    data?: PageDonationRecords_;
    message?: string;
  };

  type BaseResponsePageDonationRecordsVO_ = {
    code?: number;
    data?: PageDonationRecordsVO_;
    message?: string;
  };

  type BaseResponsePageEmoticonFavour_ = {
    code?: number;
    data?: PageEmoticonFavour_;
    message?: string;
  };

  type BaseResponsePageEventRemindVO_ = {
    code?: number;
    data?: PageEventRemindVO_;
    message?: string;
  };

  type BaseResponsePageItemInstances_ = {
    code?: number;
    data?: PageItemInstances_;
    message?: string;
  };

  type BaseResponsePageItemInstanceVO_ = {
    code?: number;
    data?: PageItemInstanceVO_;
    message?: string;
  };

  type BaseResponsePageItemTemplateVO_ = {
    code?: number;
    data?: PageItemTemplateVO_;
    message?: string;
  };

  type BaseResponsePageMockInterview_ = {
    code?: number;
    data?: PageMockInterview_;
    message?: string;
  };

  type BaseResponsePagePetSkinVO_ = {
    code?: number;
    data?: PagePetSkinVO_;
    message?: string;
  };

  type BaseResponsePagePost_ = {
    code?: number;
    data?: PagePost_;
    message?: string;
  };

  type BaseResponsePagePostVO_ = {
    code?: number;
    data?: PagePostVO_;
    message?: string;
  };

  type BaseResponsePagePropsVO_ = {
    code?: number;
    data?: PagePropsVO_;
    message?: string;
  };

  type BaseResponsePageRoomMessageVo_ = {
    code?: number;
    data?: PageRoomMessageVo_;
    message?: string;
  };

  type BaseResponsePageTags_ = {
    code?: number;
    data?: PageTags_;
    message?: string;
  };

  type BaseResponsePageTagsVO_ = {
    code?: number;
    data?: PageTagsVO_;
    message?: string;
  };

  type BaseResponsePageUser_ = {
    code?: number;
    data?: PageUser_;
    message?: string;
  };

  type BaseResponsePageUserTitle_ = {
    code?: number;
    data?: PageUserTitle_;
    message?: string;
  };

  type BaseResponsePageUserVip_ = {
    code?: number;
    data?: PageUserVip_;
    message?: string;
  };

  type BaseResponsePageUserVipVO_ = {
    code?: number;
    data?: PageUserVipVO_;
    message?: string;
  };

  type BaseResponsePageUserVO_ = {
    code?: number;
    data?: PageUserVO_;
    message?: string;
  };

  type BaseResponsePageWordLibrary_ = {
    code?: number;
    data?: PageWordLibrary_;
    message?: string;
  };

  type BaseResponsePetVO_ = {
    code?: number;
    data?: PetVO;
    message?: string;
  };

  type BaseResponsePostRewardTokenVO_ = {
    code?: number;
    data?: PostRewardTokenVO;
    message?: string;
  };

  type BaseResponsePostVO_ = {
    code?: number;
    data?: PostVO;
    message?: string;
  };

  type BaseResponseRedPacket_ = {
    code?: number;
    data?: RedPacket;
    message?: string;
  };

  type BaseResponseString_ = {
    code?: number;
    data?: string;
    message?: string;
  };

  type BaseResponseTagsVO_ = {
    code?: number;
    data?: TagsVO;
    message?: string;
  };

  type BaseResponseTokenLoginUserVo_ = {
    code?: number;
    data?: TokenLoginUserVo;
    message?: string;
  };

  type BaseResponseUndercoverPlayerDetailVO_ = {
    code?: number;
    data?: UndercoverPlayerDetailVO;
    message?: string;
  };

  type BaseResponseUndercoverPlayerVO_ = {
    code?: number;
    data?: UndercoverPlayerVO;
    message?: string;
  };

  type BaseResponseUndercoverRoomVO_ = {
    code?: number;
    data?: UndercoverRoomVO;
    message?: string;
  };

  type BaseResponseUser_ = {
    code?: number;
    data?: User;
    message?: string;
  };

  type BaseResponseUserDataWebVO_ = {
    code?: number;
    data?: UserDataWebVO;
    message?: string;
  };

  type BaseResponseUserMuteVO_ = {
    code?: number;
    data?: UserMuteVO;
    message?: string;
  };

  type BaseResponseUserRewardVO_ = {
    code?: number;
    data?: UserRewardVO;
    message?: string;
  };

  type BaseResponseUserTitle_ = {
    code?: number;
    data?: UserTitle;
    message?: string;
  };

  type BaseResponseUserVipVO_ = {
    code?: number;
    data?: UserVipVO;
    message?: string;
  };

  type BaseResponseUserVO_ = {
    code?: number;
    data?: UserVO;
    message?: string;
  };

  type BaseResponseWebParseVO_ = {
    code?: number;
    data?: WebParseVO;
    message?: string;
  };

  type BaseResponseWordLibrary_ = {
    code?: number;
    data?: WordLibrary;
    message?: string;
  };

  type BattleResultVO = {
    /** 当前攻击对象类型：PET-宠物攻击，BOSS-Boss攻击 */
    attackerType?: string;
    /** Boss剩余血量 */
    bossRemainingHealth?: number;
    /** 扣血量 */
    damage?: number;
    /** 是否连击 */
    isCombo?: boolean;
    /** 是否暴击 */
    isCritical?: boolean;
    /** 是否闪避 */
    isDodge?: boolean;
    /** 是否普通攻击 */
    isNormalAttack?: boolean;
    /** 宠物剩余血量 */
    petRemainingHealth?: number;
  };

  type battleUsingGETParams = {
    /** bossId */
    bossId: number;
  };

  type BossBattleInfoVO = {
    bossInfo?: BossInfo;
    petInfo?: PetInfo;
  };

  type BossChallengeRankingVO = {
    damage?: number;
    petAvatar?: string;
    petName?: string;
    rank?: number;
    userAvatar?: string;
    userId?: number;
    userName?: string;
  };

  type BossInfo = {
    attack?: number;
    avatar?: string;
    currentHealth?: number;
    id?: number;
    maxHealth?: number;
    name?: string;
    rewardPoints?: number;
  };

  type BossVO = {
    attack?: number;
    avatar?: string;
    health?: number;
    id?: number;
    name?: string;
    rewardPoints?: number;
  };

  type callbackUsingDELETEParams = {
    auth_code?: string;
    authorization_code?: string;
    code?: string;
    oauth_token?: string;
    oauth_verifier?: string;
    state?: string;
    /** source */
    source: string;
  };

  type callbackUsingGETParams = {
    auth_code?: string;
    authorization_code?: string;
    code?: string;
    oauth_token?: string;
    oauth_verifier?: string;
    state?: string;
    /** source */
    source: string;
  };

  type callbackUsingPATCHParams = {
    auth_code?: string;
    authorization_code?: string;
    code?: string;
    oauth_token?: string;
    oauth_verifier?: string;
    state?: string;
    /** source */
    source: string;
  };

  type callbackUsingPOSTParams = {
    auth_code?: string;
    authorization_code?: string;
    code?: string;
    oauth_token?: string;
    oauth_verifier?: string;
    state?: string;
    /** source */
    source: string;
  };

  type callbackUsingPUTParams = {
    auth_code?: string;
    authorization_code?: string;
    code?: string;
    oauth_token?: string;
    oauth_verifier?: string;
    state?: string;
    /** source */
    source: string;
  };

  type ChildCommentQueryRequest = {
    current?: number;
    pageSize?: number;
    rootId?: number;
    sortField?: string;
    sortOrder?: string;
  };

  type CommentAddRequest = {
    content?: string;
    parentId?: number;
    postId?: number;
    rootId?: number;
  };

  type CommentNodeVO = {
    childCount?: number;
    content?: string;
    createTime?: string;
    hasThumb?: boolean;
    id?: number;
    parentId?: number;
    postId?: number;
    previewChildren?: CommentVO[];
    thumbNum?: number;
    user?: UserVO;
    userId?: number;
  };

  type CommentQueryRequest = {
    current?: number;
    pageSize?: number;
    postId?: number;
    sortField?: string;
    sortOrder?: string;
  };

  type CommentThumbAddRequest = {
    commentId?: number;
  };

  type CommentVO = {
    content?: string;
    createTime?: string;
    hasThumb?: boolean;
    id?: number;
    parentId?: number;
    postId?: number;
    thumbNum?: number;
    user?: UserVO;
    userId?: number;
  };

  type CosCredentialVo = {
    /** 桶名称 */
    bucket?: string;
    /** 文件地址 */
    key?: string;
    /** 区域 */
    region?: string;
    response?: Response;
  };

  type CreatePetRequest = {
    name?: string;
  };

  type CreateRedPacketRequest = {
    /** 红包个数 */
    count: number;
    name?: string;
    /** 红包总金额（积分） */
    totalAmount: number;
    /** 红包类型：1-随机红包，2-平均红包 */
    type: number;
  };

  type Credentials = {
    sessionToken?: string;
    tmpSecretId?: string;
    tmpSecretKey?: string;
    token?: string;
  };

  type DeleteRequest = {
    id?: string;
  };

  type DonationRecords = {
    amount?: number;
    createTime?: string;
    id?: number;
    isDelete?: number;
    remark?: string;
    updateTime?: string;
    userId?: number;
  };

  type DonationRecordsAddRequest = {
    amount?: number;
    remark?: string;
    userId?: number;
  };

  type DonationRecordsQueryRequest = {
    amount?: number;
    createTime?: string;
    current?: number;
    id?: number;
    pageSize?: number;
    remark?: string;
    sortField?: string;
    sortOrder?: string;
    updateTime?: string;
    userId?: number;
  };

  type DonationRecordsUpdateRequest = {
    amount?: number;
    id?: number;
    isDelete?: number;
    remark?: string;
    userId?: number;
  };

  type DonationRecordsVO = {
    amount?: number;
    createTime?: string;
    donorUser?: LoginUserVO;
    id?: number;
    remark?: string;
    userId?: number;
  };

  type DrawDataSaveRequest = {
    drawData?: string;
    roomId?: string;
  };

  type DrawGuessRequest = {
    guessWord?: string;
    messageWrapper?: MessageWrapper;
    roomId?: string;
  };

  type DrawGuessVO = {
    guessTime?: string;
    guessWord?: string;
    isCorrect?: boolean;
    userAvatar?: string;
    userId?: number;
    userName?: string;
  };

  type DrawPlayerVO = {
    hasGuessedCorrectly?: boolean;
    isCreator?: boolean;
    isCurrentDrawer?: boolean;
    score?: number;
    userAvatar?: string;
    userId?: number;
    userName?: string;
  };

  type DrawRoomCreateRequest = {
    creatorOnlyMode?: boolean;
    maxPlayers?: number;
    totalRounds?: number;
    wordType?: string;
  };

  type DrawRoomVO = {
    correctGuessPlayers?: DrawPlayerVO[];
    createTime?: string;
    creatorAvatar?: string;
    creatorId?: number;
    creatorName?: string;
    creatorOnlyMode?: boolean;
    currentDrawerId?: number;
    currentDrawerName?: string;
    currentPlayers?: number;
    currentRound?: number;
    currentWord?: string;
    drawData?: string;
    maxPlayers?: number;
    participants?: DrawPlayerVO[];
    roomId?: string;
    roundEndTime?: number;
    startTime?: string;
    status?: 'WAITING' | 'PLAYING' | 'ENDED';
    totalRounds?: number;
    wordHint?: string;
  };

  type eliminatePlayerUsingPOSTParams = {
    /** roomId */
    roomId: string;
    /** userId */
    userId: number;
  };

  type EmoticonFavour = {
    createTime?: string;
    emoticonSrc?: string;
    id?: number;
    updateTime?: string;
    userId?: number;
  };

  type endGameUsingPOST1Params = {
    /** roomId */
    roomId: string;
  };

  type endGameUsingPOSTParams = {
    /** roomId */
    roomId: string;
  };

  type EventRemindQueryRequest = {
    action?: string;
    current?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    state?: number;
  };

  type EventRemindStateRequest = {
    ids?: number[];
  };

  type EventRemindVO = {
    action?: string;
    createTime?: string;
    id?: number;
    recipientId?: number;
    remindTime?: string;
    senderId?: number;
    senderUser?: UserVO;
    sourceContent?: string;
    sourceId?: number;
    sourceType?: number;
    state?: number;
    url?: string;
  };

  type exchangeFrameUsingPOSTParams = {
    /** frameId */
    frameId: number;
  };

  type feedPetUsingPOSTParams = {
    /** petId */
    petId: number;
  };

  type FluxString_ = {
    prefetch?: number;
  };

  type generatePresignedDownloadUrlUsingGETParams = {
    /** fileName */
    fileName: string;
  };

  type getBossBattleInfoUsingGETParams = {
    /** bossId */
    bossId: number;
  };

  type getBossChallengeRankingUsingGETParams = {
    /** bossId */
    bossId: number;
    /** limit */
    limit?: number;
  };

  type getCosCredentialUsingGETParams = {
    /** fileName */
    fileName?: string;
  };

  type getCurrentPlayerInfoUsingGETParams = {
    /** roomId */
    roomId: string;
  };

  type getCurrentRewardUserUsingGETParams = {
    /** postId */
    postId?: number;
  };

  type getDonationRecordsVoByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type getHeroByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type getItemInstanceByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type getItemTemplateVOByIdUsingPOSTParams = {
    /** id */
    id?: number;
  };

  type getMinioPresignedUsingGETParams = {
    /** fileName */
    fileName?: string;
  };

  type getMockInterviewByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type getOtherUserPetUsingGETParams = {
    /** otherUserId */
    otherUserId: number;
  };

  type getPetRankListUsingGETParams = {
    /** limit */
    limit?: number;
  };

  type getPlayerDetailInfoUsingGETParams = {
    /** roomId */
    roomId: string;
    /** userId */
    userId: number;
  };

  type getPlayerInfoUsingGETParams = {
    /** roomId */
    roomId: string;
    /** userId */
    userId: number;
  };

  type getPostRewardTokenUsingGETParams = {
    /** postId */
    postId?: number;
  };

  type getPostVoByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type getRedPacketDetailUsingGETParams = {
    /** 红包ID */
    redPacketId: string;
  };

  type getRedPacketRecordsUsingGETParams = {
    /** 红包ID */
    redPacketId: string;
  };

  type getRoomByIdUsingGET1Params = {
    /** roomId */
    roomId?: string;
  };

  type getRoomByIdUsingGETParams = {
    /** roomId */
    roomId: string;
  };

  type getRoomGuessesUsingGETParams = {
    /** roomId */
    roomId: string;
  };

  type getRoomPlayersDetailUsingGETParams = {
    /** roomId */
    roomId: string;
  };

  type getRoomVotesUsingGETParams = {
    /** roomId */
    roomId: string;
  };

  type getTagsVOByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type getUserByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type getUserMuteInfoUsingGETParams = {
    /** userId */
    userId: number;
  };

  type getUserTitleByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type getUserVipVOByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type getUserVoByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type getWordLibraryByIdUsingGETParams = {
    /** id */
    id?: number;
  };

  type grabRedPacketUsingPOSTParams = {
    /** 红包ID */
    redPacketId: string;
  };

  type HeroRankingVO = {
    rank?: number;
    score?: number;
    userAvatar?: string;
    userId?: number;
    userName?: string;
  };

  type HeroVO = {
    ability?: string;
    cname?: string;
    ename?: string;
    faction?: string;
    height?: string;
    id?: string;
    identity?: string;
    mossId?: number;
    newType?: number;
    officialLink?: string;
    primaryType?: number;
    quote?: string;
    race?: string;
    region?: string;
    releaseDate?: string;
    secondaryType?: number;
    skins?: string;
    skinsNum?: number;
    title?: string;
  };

  type HotPostDataVO = {
    followerCount?: number;
    title?: string;
    url?: string;
  };

  type HotPostVO = {
    category?: number;
    categoryName?: string;
    data?: HotPostDataVO[];
    iconUrl?: string;
    id?: number;
    name?: string;
    type?: string;
    typeName?: string;
    updateTime?: string;
  };

  type ItemInstanceAddRequest = {
    /** 是否绑定（1-绑定后不可交易，0-未绑定可交易） */
    bound?: number;
    /** 耐久度（可选，部分装备适用） */
    durability?: number;
    /** 强化等级 */
    enhanceLevel?: number;
    /** 扩展信息（如附魔、镶嵌孔、特殊属性等JSON数据） */
    extraData?: Record<string, any>;
    /** 持有者用户ID，如果不传默认添加当前登录用户 */
    ownerUserId?: number;
    /** 添加数量，stackable为1时有效，stackable为0会忽略 */
    quantity?: number;
    /** 物品模板ID */
    templateId: number;
  };

  type ItemInstanceEditRequest = {
    /** 是否绑定（1绑定，0未绑定） */
    bound?: number;
    /** 耐久度 */
    durability?: number;
    /** 强化等级 */
    enhanceLevel?: number;
    /** 扩展信息（JSON字符串或对象） */
    extraData?: Record<string, any>;
    /** 物品实例ID */
    id: number;
    /** 是否需要返回模板信息，默认 true */
    includeTemplate?: boolean;
    /** 持有者用户ID（允许转移所有权） */
    ownerUserId?: number;
    /** 数量（大于0有效） */
    quantity?: number;
    /** 物品模板ID（允许修改实例关联的模板） */
    templateId?: number;
  };

  type ItemInstanceQueryRequest = {
    /** 物品大类（可选） */
    category?: string;
    current?: number;
    /** 装备槽位（可选） */
    equipSlot?: string;
    pageSize?: number;
    /** 稀有度等级（可选） */
    rarity?: number;
    sortField?: string;
    sortOrder?: string;
  };

  type ItemInstances = {
    bound?: number;
    createTime?: string;
    durability?: number;
    enhanceLevel?: number;
    extraData?: Record<string, any>;
    id?: number;
    isDelete?: number;
    ownerUserId?: number;
    quantity?: number;
    templateId?: number;
    updateTime?: string;
  };

  type ItemInstanceUpdateRequest = {
    /** 绑定状态：1-绑定，0-未绑定 */
    bound?: number;
    /** 强化等级 */
    enhanceLevel?: number;
    /** 扩展信息(JSON) */
    extraData?: string;
    /** 物品实例ID */
    id: number;
    ownerUserId?: number;
    /** 数量 */
    quantity?: number;
    templateId?: number;
  };

  type ItemInstanceVO = {
    bound?: number;
    createTime?: string;
    durability?: number;
    enhanceLevel?: number;
    extraData?: Record<string, any>;
    id?: number;
    ownerUserId?: number;
    quantity?: number;
    template?: ItemTemplateVO;
    templateId?: number;
    updateTime?: string;
  };

  type ItemTemplateAddRequest = {
    /** 基础攻击力 */
    baseAttack?: number;
    /** 基础防御力 */
    baseDefense?: number;
    /** 基础生命值 */
    baseHp?: number;
    /** 物品大类：equipment-装备类（能穿戴的）、consumable-消耗品（药水/卷轴/食物）、material-材料（强化石/合成材料） */
    category?: string;
    /** 模板唯一码，例如 sword_iron_01 */
    code?: string;
    /** 物品描述 */
    description?: string;
    /** 可穿戴槽位: head-头部, hand-手部, foot-脚部, weapon-武器；NULL 表示无法穿戴 */
    equipSlot?: string;
    /** 物品图标地址 */
    icon?: string;
    /** 使用等级需求 */
    levelReq?: number;
    /** 非常规属性/词缀(JSON)，格式: [{k,v},...] */
    mainAttr?: string;
    /** 物品名称 */
    name?: string;
    /** 稀有度等级（1-8，数字越高越稀有） */
    rarity?: number;
    /** 分解后获得的积分 */
    removePoint?: number;
    /** 是否可叠加，0-不可叠加，1-可叠加（如消耗品） */
    stackable?: number;
    /** 物品子类型，例如 weapon 武器、head 头盔、foot 鞋子、hand 手套 */
    subType?: string;
  };

  type ItemTemplateEditRequest = {
    /** 基础攻击力 */
    baseAttack?: number;
    /** 基础防御力 */
    baseDefense?: number;
    /** 基础生命值 */
    baseHp?: number;
    /** 物品大类 */
    category: string;
    /** 模板唯一码 */
    code: string;
    /** 物品描述 */
    description?: string;
    /** 可穿戴槽位 */
    equipSlot?: string;
    /** 物品图标地址 */
    icon?: string;
    /** 物品模板ID */
    id: number;
    /** 逻辑删除标识（0-正常，1-已删除） */
    isDelete?: number;
    /** 使用等级需求 */
    levelReq?: number;
    /** 非常规属性/词缀(JSON) */
    mainAttr?: string;
    /** 物品名称 */
    name: string;
    /** 稀有度等级（1-8） */
    rarity?: number;
    /** 分解后获得的积分 */
    removePoint?: number;
    /** 是否可叠加（0-不可叠加，1-可叠加） */
    stackable?: number;
    /** 物品子类型 */
    subType?: string;
  };

  type ItemTemplateQueryRequest = {
    /** 物品大类：equipment-装备类、consumable-消耗品、material-材料 */
    category?: string;
    /** 模板唯一码（精确匹配） */
    code?: string;
    current?: number;
    /** id */
    id?: number;
    /** 物品名称（模糊搜索） */
    name?: string;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    /** 是否可叠加（0-不可叠加，1-可叠加） */
    stackable?: number;
    /** 子类型，例如 weapon 武器、head 头盔、foot 鞋子、hand 手套 */
    subType?: string;
  };

  type ItemTemplateVO = {
    baseAttack?: number;
    baseDefense?: number;
    baseHp?: number;
    category?: string;
    code?: string;
    description?: string;
    equipSlot?: string;
    icon?: string;
    id?: number;
    levelReq?: number;
    name?: string;
    rarity?: number;
    removePoint?: number;
    stackable?: number;
    subType?: string;
  };

  type joinRoomUsingPOSTParams = {
    /** roomId */
    roomId: string;
  };

  type linuxDoCallbackUsingGETParams = {
    /** code */
    code?: string;
    /** state */
    state?: string;
  };

  type listPetSkinsUsingGETParams = {
    current?: number;
    name?: string;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
  };

  type listPropsPageUsingGETParams = {
    current?: number;
    name?: string;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    type?: string;
  };

  type listUserTitlesByUserIdUsingGETParams = {
    /** userId */
    userId: number;
  };

  type LoginUserVO = {
    avatarFramerUrl?: string;
    bindPlatforms?: PlatformBindVO[];
    createTime?: string;
    email?: string;
    id?: number;
    lastSignInDate?: string;
    level?: number;
    points?: number;
    titleId?: number;
    titleIdList?: string;
    updateTime?: string;
    usedPoints?: number;
    userAvatar?: string;
    userName?: string;
    userProfile?: string;
    userRole?: string;
    vip?: boolean;
  };

  type Message = {
    content?: string;
    id?: string;
    mentionedUsers?: Sender[];
    quotedMessage?: Message;
    roomId?: string;
    sender?: Sender;
    timestamp?: string;
  };

  type MessageQueryRequest = {
    current?: number;
    pageSize?: number;
    roomId?: number;
    sortField?: string;
    sortOrder?: string;
  };

  type MessageWrapper = {
    message?: Message;
  };

  type MockInterview = {
    createTime?: string;
    difficulty?: string;
    id?: number;
    isDelete?: number;
    jobPosition?: string;
    messages?: string;
    status?: number;
    updateTime?: string;
    userId?: number;
    workExperience?: string;
  };

  type MockInterviewAddRequest = {
    difficulty?: string;
    jobPosition?: string;
    workExperience?: string;
  };

  type MockInterviewEventRequest = {
    event?: string;
    id?: number;
    message?: string;
  };

  type MockInterviewQueryRequest = {
    current?: number;
    difficulty?: string;
    id?: number;
    jobPosition?: string;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    status?: number;
    userId?: number;
    workExperience?: string;
  };

  type ModelAndView = {
    empty?: boolean;
    model?: Record<string, any>;
    modelMap?: Record<string, any>;
    reference?: boolean;
    status?:
      | 'CONTINUE'
      | 'SWITCHING_PROTOCOLS'
      | 'PROCESSING'
      | 'CHECKPOINT'
      | 'OK'
      | 'CREATED'
      | 'ACCEPTED'
      | 'NON_AUTHORITATIVE_INFORMATION'
      | 'NO_CONTENT'
      | 'RESET_CONTENT'
      | 'PARTIAL_CONTENT'
      | 'MULTI_STATUS'
      | 'ALREADY_REPORTED'
      | 'IM_USED'
      | 'MULTIPLE_CHOICES'
      | 'MOVED_PERMANENTLY'
      | 'FOUND'
      | 'MOVED_TEMPORARILY'
      | 'SEE_OTHER'
      | 'NOT_MODIFIED'
      | 'USE_PROXY'
      | 'TEMPORARY_REDIRECT'
      | 'PERMANENT_REDIRECT'
      | 'BAD_REQUEST'
      | 'UNAUTHORIZED'
      | 'PAYMENT_REQUIRED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'METHOD_NOT_ALLOWED'
      | 'NOT_ACCEPTABLE'
      | 'PROXY_AUTHENTICATION_REQUIRED'
      | 'REQUEST_TIMEOUT'
      | 'CONFLICT'
      | 'GONE'
      | 'LENGTH_REQUIRED'
      | 'PRECONDITION_FAILED'
      | 'PAYLOAD_TOO_LARGE'
      | 'REQUEST_ENTITY_TOO_LARGE'
      | 'URI_TOO_LONG'
      | 'REQUEST_URI_TOO_LONG'
      | 'UNSUPPORTED_MEDIA_TYPE'
      | 'REQUESTED_RANGE_NOT_SATISFIABLE'
      | 'EXPECTATION_FAILED'
      | 'I_AM_A_TEAPOT'
      | 'INSUFFICIENT_SPACE_ON_RESOURCE'
      | 'METHOD_FAILURE'
      | 'DESTINATION_LOCKED'
      | 'UNPROCESSABLE_ENTITY'
      | 'LOCKED'
      | 'FAILED_DEPENDENCY'
      | 'TOO_EARLY'
      | 'UPGRADE_REQUIRED'
      | 'PRECONDITION_REQUIRED'
      | 'TOO_MANY_REQUESTS'
      | 'REQUEST_HEADER_FIELDS_TOO_LARGE'
      | 'UNAVAILABLE_FOR_LEGAL_REASONS'
      | 'INTERNAL_SERVER_ERROR'
      | 'NOT_IMPLEMENTED'
      | 'BAD_GATEWAY'
      | 'SERVICE_UNAVAILABLE'
      | 'GATEWAY_TIMEOUT'
      | 'HTTP_VERSION_NOT_SUPPORTED'
      | 'VARIANT_ALSO_NEGOTIATES'
      | 'INSUFFICIENT_STORAGE'
      | 'LOOP_DETECTED'
      | 'BANDWIDTH_LIMIT_EXCEEDED'
      | 'NOT_EXTENDED'
      | 'NETWORK_AUTHENTICATION_REQUIRED';
    view?: View;
    viewName?: string;
  };

  type NewUserDataWebRequest = {
    beginTime?: string;
    endTime?: string;
    type?: number;
  };

  type NewUserDataWebVO = {
    date?: string;
    newUserCount?: number;
  };

  type nextRoundUsingPOSTParams = {
    /** roomId */
    roomId: string;
  };

  type OrderItem = {
    asc?: boolean;
    column?: string;
  };

  type OtherUserPetVO = {
    createTime?: string;
    exp?: number;
    hunger?: number;
    level?: number;
    mood?: number;
    name?: string;
    petId?: number;
    petUrl?: string;
    skins?: PetSkinVO[];
    userId?: number;
  };

  type PageAvatarFrameVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: AvatarFrameVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageCommentNodeVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: CommentNodeVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageCommentVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: CommentVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageDonationRecords_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: DonationRecords[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageDonationRecordsVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: DonationRecordsVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageEmoticonFavour_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: EmoticonFavour[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageEventRemindVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: EventRemindVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageItemInstances_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: ItemInstances[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageItemInstanceVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: ItemInstanceVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageItemTemplateVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: ItemTemplateVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageMockInterview_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: MockInterview[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PagePetSkinVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: PetSkinVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PagePost_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: Post[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PagePostVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: PostVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PagePropsVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: PropsVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageRequest = {
    current?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
  };

  type PageRoomMessageVo_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: RoomMessageVo[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageTags_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: Tags[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageTagsVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: TagsVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageUser_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: User[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageUserTitle_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: UserTitle[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageUserVip_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: UserVip[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageUserVipVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: UserVipVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageUserVO_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: UserVO[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type PageWordLibrary_ = {
    countId?: string;
    current?: number;
    maxLimit?: number;
    optimizeCountSql?: boolean;
    orders?: OrderItem[];
    pages?: number;
    records?: WordLibrary[];
    searchCount?: boolean;
    size?: number;
    total?: number;
  };

  type parseWebPageUsingGETParams = {
    /** url */
    url: string;
  };

  type patPetUsingPOSTParams = {
    /** petId */
    petId: number;
  };

  type PetInfo = {
    attack?: number;
    avatar?: string;
    health?: number;
    level?: number;
    name?: string;
    petId?: number;
  };

  type PetRankVO = {
    exp?: number;
    level?: number;
    name?: string;
    petId?: number;
    petUrl?: string;
    rank?: number;
    userAvatar?: string;
    userId?: number;
    userName?: string;
  };

  type PetSkinExchangeRequest = {
    skinId?: number;
  };

  type PetSkinSetRequest = {
    skinId?: number;
  };

  type PetSkinVO = {
    description?: string;
    name?: string;
    owned?: boolean;
    points?: number;
    skinId?: number;
    url?: string;
  };

  type PetVO = {
    createTime?: string;
    exp?: number;
    hunger?: number;
    level?: number;
    mood?: number;
    name?: string;
    petId?: number;
    petUrl?: string;
    skins?: PetSkinVO[];
    userId?: number;
  };

  type PlatformBindVO = {
    avatar?: string;
    nickname?: string;
    platform?: string;
  };

  type Post = {
    content?: string;
    coverImage?: string;
    createTime?: string;
    favourNum?: number;
    id?: number;
    isDelete?: number;
    isFeatured?: number;
    summary?: string;
    tags?: string;
    thumbNum?: number;
    title?: string;
    updateTime?: string;
    userId?: number;
    viewNum?: number;
  };

  type PostAddRequest = {
    content?: string;
    coverImage?: string;
    tags?: string[];
    title?: string;
  };

  type PostEditRequest = {
    content?: string;
    coverImage?: string;
    id?: string;
    tags?: string[];
    title?: string;
  };

  type PostFavourAddRequest = {
    postId?: number;
  };

  type PostFavourQueryRequest = {
    current?: number;
    pageSize?: number;
    postQueryRequest?: PostQueryRequest;
    sortField?: string;
    sortOrder?: string;
    userId?: number;
  };

  type PostFeaturedRequest = {
    id?: number;
    isFeatured?: number;
  };

  type PostQueryRequest = {
    content?: string;
    current?: number;
    isFeatured?: number;
    pageSize?: number;
    searchText?: string;
    sortField?: string;
    sortOrder?: string;
    tags?: string[];
    title?: string;
    userId?: number;
  };

  type PostRandomThumbRequest = {
    postId?: number;
    randomIndex?: number;
  };

  type PostRewardTokenVO = {
    rewardToken?: string;
  };

  type PostThumbAddRequest = {
    postId?: number;
  };

  type PostUpdateRequest = {
    content?: string;
    coverImage?: string;
    id?: string;
    tags?: string[];
    title?: string;
  };

  type PostVO = {
    commentNum?: number;
    content?: string;
    coverImage?: string;
    createTime?: string;
    favourNum?: number;
    hasFavour?: boolean;
    hasThumb?: boolean;
    id?: number;
    isFeatured?: number;
    summary?: string;
    tagList?: string[];
    thumbComment?: CommentVO;
    thumbNum?: number;
    title?: string;
    updateTime?: string;
    user?: UserVO;
    userId?: number;
    viewNum?: number;
  };

  type PropsPurchaseRequest = {
    propsId?: number;
  };

  type PropsVO = {
    createTime?: string;
    description?: string;
    frameId?: number;
    imgUrl?: string;
    name?: string;
    points?: number;
    type?: string;
  };

  type quitRoomUsingPOSTParams = {
    /** roomId */
    roomId: string;
  };

  type recordGuessSuccessUsingPOSTParams = {
    /** heroId */
    heroId?: number;
  };

  type RedPacket = {
    amountPerPacket?: number;
    count?: number;
    createTime?: string;
    creatorAvatar?: string;
    creatorId?: number;
    creatorName?: string;
    expireTime?: string;
    grabCount?: number;
    id?: string;
    name?: string;
    remainingAmount?: number;
    remainingCount?: number;
    status?: number;
    totalAmount?: number;
    type?: number;
  };

  type removeActiveRoomUsingPOSTParams = {
    /** roomId */
    roomId?: string;
  };

  type removeRoomUsingPOSTParams = {
    /** roomId */
    roomId: string;
  };

  type removeTitleFromUserUsingPOSTParams = {
    /** titleId */
    titleId: number;
    /** userId */
    userId: number;
  };

  type renderAuthUsingGETParams = {
    /** source */
    source: string;
  };

  type Response = {
    credentials?: Credentials;
    expiration?: string;
    expiredTime?: number;
    requestId?: string;
    startTime?: number;
  };

  type RoomMessageVo = {
    id?: number;
    messageWrapper?: MessageWrapper;
    roomId?: number;
    userId?: number;
  };

  type SaTokenInfo = {
    isLogin?: boolean;
    loginDevice?: string;
    loginId?: Record<string, any>;
    loginType?: string;
    sessionTimeout?: number;
    tag?: string;
    tokenActiveTimeout?: number;
    tokenName?: string;
    tokenSessionTimeout?: number;
    tokenTimeout?: number;
    tokenValue?: string;
  };

  type SaveTodoDto = {
    /** Todo data */
    todoData: Record<string, any>[];
  };

  type Sender = {
    avatar?: string;
    avatarFramerUrl?: string;
    country?: string;
    id?: string;
    isAdmin?: boolean;
    isVip?: boolean;
    level?: number;
    name?: string;
    points?: number;
    region?: string;
    /** 用户称号 ID */
    titleId?: number;
    /** 用户称号ID列表 */
    titleIdList?: string;
    /** 用户简介 */
    userProfile?: string;
  };

  type setCurrentFrameUsingPOST1Params = {
    /** titleId */
    titleId: number;
  };

  type setCurrentFrameUsingPOSTParams = {
    /** frameId */
    frameId: number;
  };

  type SimpleHeroVO = {
    cname?: string;
    id?: number;
  };

  type startGameUsingPOST1Params = {
    /** roomId */
    roomId: string;
  };

  type startGameUsingPOSTParams = {
    /** roomId */
    roomId: string;
  };

  type streamChatDemoUsingGETParams = {
    /** prompt */
    prompt: string;
  };

  type Tags = {
    color?: string;
    createTime?: string;
    icon?: string;
    id?: number;
    isDelete?: number;
    sort?: number;
    tagsName?: string;
    type?: number;
    updateTime?: string;
  };

  type TagsAddRequest = {
    color?: string;
    icon?: string;
    sort?: number;
    tagsName?: string;
    type?: number;
  };

  type TagsQueryRequest = {
    current?: number;
    id?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    tagsName?: string;
    type?: number;
  };

  type TagsUpdateRequest = {
    color?: string;
    icon?: string;
    id?: number;
    sort?: number;
    tagsName?: string;
    type?: number;
  };

  type TagsVO = {
    color?: string;
    icon?: string;
    id?: number;
    sort?: number;
    tagsName?: string;
    type?: number;
  };

  type TokenLoginUserVo = {
    avatarFramerUrl?: string;
    bindPlatforms?: PlatformBindVO[];
    createTime?: string;
    email?: string;
    id?: number;
    lastSignInDate?: string;
    level?: number;
    points?: number;
    saTokenInfo?: SaTokenInfo;
    titleId?: number;
    titleIdList?: string;
    updateTime?: string;
    usedPoints?: number;
    userAvatar?: string;
    userName?: string;
    userProfile?: string;
    userRole?: string;
    vip?: boolean;
  };

  type unbindUsingDELETEParams = {
    /** source */
    source: string;
  };

  type UndercoverGuessRequest = {
    guessWord?: string;
    roomId?: string;
  };

  type UndercoverPlayerDetailVO = {
    guessCount?: number;
    isEliminated?: boolean;
    remainingGuessCount?: number;
    userAvatar?: string;
    userId?: number;
    userName?: string;
    voteCount?: number;
  };

  type UndercoverPlayerVO = {
    guessCount?: number;
    isEliminated?: boolean;
    remainingGuessCount?: number;
    role?: string;
    userId?: number;
    word?: string;
  };

  type UndercoverRoomCreateRequest = {
    /** 平民词 */
    civilianWord?: string;
    /** 持续时间秒 */
    duration?: number;
    /** 游戏模式：1-常规模式(默认)，2-卧底猜词模式 */
    gameMode?: number;
    /** 房间最大人数 */
    maxPlayers?: number;
    /** 卧底词 */
    undercoverWord?: string;
  };

  type UndercoverRoomJoinRequest = {
    roomId?: string;
  };

  type UndercoverRoomQuitRequest = {
    roomId?: string;
  };

  type UndercoverRoomVO = {
    createTime?: string;
    creatorAvatar?: string;
    creatorId?: number;
    creatorName?: string;
    duration?: number;
    eliminatedIds?: number[];
    gameMode?: number;
    gameResult?: string;
    maxPlayers?: number;
    orderedParticipantIds?: number[];
    participantIds?: number[];
    participants?: UndercoverPlayerDetailVO[];
    remainingTime?: number;
    role?: string;
    roomId?: string;
    startTime?: string;
    status?: 'WAITING' | 'PLAYING' | 'ENDED';
    votes?: UndercoverVoteVO[];
    word?: string;
  };

  type UndercoverVoteRequest = {
    roomId?: string;
    targetId?: number;
  };

  type UndercoverVoteVO = {
    targetAvatar?: string;
    targetId?: number;
    targetName?: string;
    voteTime?: string;
    voterAvatar?: string;
    voterId?: number;
    voterName?: string;
  };

  type unmuteUserUsingPOSTParams = {
    /** userId */
    userId: number;
  };

  type UpdatePetNameRequest = {
    name?: string;
    petId?: number;
  };

  type uploadFileByMinioUsingPOSTParams = {
    biz?: string;
  };

  type uploadFileUsingPOSTParams = {
    biz?: string;
  };

  type User = {
    avatarFramerList?: string;
    avatarFramerUrl?: string;
    createTime?: string;
    email?: string;
    id?: number;
    isDelete?: number;
    mpOpenId?: string;
    titleId?: number;
    titleIdList?: string;
    unionId?: string;
    updateTime?: string;
    userAccount?: string;
    userAvatar?: string;
    userName?: string;
    userPassword?: string;
    userProfile?: string;
    userRole?: string;
  };

  type UserAddRequest = {
    userAccount?: string;
    userAvatar?: string;
    userName?: string;
    userRole?: string;
  };

  type UserBindEmailRequest = {
    code?: string;
    email?: string;
  };

  type UserChatResponse = {
    /** 用户头像 */
    avatar?: string;
    /** 头像框 URL */
    avatarFramerUrl?: string;
    /** 用户 ID */
    id?: string;
    /** 是否是管理员 */
    isAdmin?: boolean;
    /** 用户等级 */
    level?: number;
    /** 用户名称 */
    name?: string;
    /** 用户积分 */
    points?: number;
    /** 用户状态 */
    status?: string;
    /** 用户称号 ID */
    titleId?: number;
    /** 用户称号ID列表 */
    titleIdList?: string;
    /** 用户简介 */
    userProfile?: string;
  };

  type UserDataWebVO = {
    thisMonthActiveUsers?: number;
    todayActiveUsers?: number;
    todayNewUsers?: number;
    totalUsers?: number;
  };

  type UserEmailResetPasswordRequest = {
    checkPassword?: string;
    code?: string;
    email?: string;
    userPassword?: string;
  };

  type UserEmailSendRequest = {
    email?: string;
  };

  type userLoginByGithubUsingPOSTParams = {
    auth_code?: string;
    authorization_code?: string;
    code?: string;
    oauth_token?: string;
    oauth_verifier?: string;
    state?: string;
  };

  type UserLoginRequest = {
    email?: string;
    userAccount?: string;
    userPassword?: string;
  };

  type UserMuteRequest = {
    /** 禁言时间（秒） */
    duration?: number;
    /** 用户id */
    userId?: number;
  };

  type UserMuteVO = {
    /** 是否被禁言 */
    isMuted?: boolean;
    /** 剩余禁言时间（格式化为时分秒） */
    remainingTime?: string;
  };

  type UserQueryRequest = {
    createTimeRange?: string[];
    current?: number;
    id?: number;
    mpOpenId?: string;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    unionId?: string;
    updateTimeRange?: string[];
    userAccount?: string;
    userName?: string;
    userProfile?: string;
    userRole?: string;
  };

  type UserRegisterRequest = {
    captchaVerification?: string;
    checkPassword?: string;
    code?: string;
    email?: string;
    userAccount?: string;
    userPassword?: string;
  };

  type UserRewardVO = {
    createTime?: string;
    id?: number;
    rewardToken?: string;
    userAvatar?: string;
    userName?: string;
    userProfile?: string;
    userRole?: string;
  };

  type UserTitle = {
    createTime?: string;
    isDelete?: number;
    name?: string;
    titleId?: number;
    titleImg?: string;
    updateTime?: string;
  };

  type UserTitleAddRequest = {
    name?: string;
  };

  type UserTitleQueryRequest = {
    current?: number;
    name?: string;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    titleId?: number;
  };

  type UserTitleUpdateRequest = {
    name?: string;
    titleId?: number;
  };

  type UserUpdateMyRequest = {
    userAvatar?: string;
    userName?: string;
    userProfile?: string;
  };

  type UserUpdateRequest = {
    id?: number;
    userAvatar?: string;
    userName?: string;
    userProfile?: string;
    userRole?: string;
  };

  type UserVip = {
    cardNo?: string;
    createTime?: string;
    id?: number;
    isDelete?: number;
    type?: number;
    updateTime?: string;
    userId?: number;
    validDays?: string;
  };

  type UserVipAddRequest = {
    cardNo?: string;
    type?: number;
    userId?: number;
    validDays?: string;
  };

  type UserVipQueryRequest = {
    cardNo?: string;
    createTimeEnd?: string;
    createTimeStart?: string;
    current?: number;
    id?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    type?: number;
    updateTimeEnd?: string;
    updateTimeStart?: string;
    userId?: number;
  };

  type UserVipUpdateRequest = {
    cardNo?: string;
    id?: number;
    type?: number;
    userId?: number;
    validDays?: string;
  };

  type UserVipVO = {
    cardNo?: string;
    createTime?: string;
    id?: number;
    isExpired?: boolean;
    type?: number;
    user?: UserVO;
    userId?: number;
    validDays?: string;
  };

  type UserVO = {
    createTime?: string;
    id?: number;
    userAvatar?: string;
    userName?: string;
    userProfile?: string;
    userRole?: string;
  };

  type View = {
    contentType?: string;
  };

  type VO = {
    /** 抢到的金额 */
    amount?: number;
    /** 抢红包时间 */
    grabTime?: string;
    /** 记录ID */
    id?: string;
    /** 红包ID */
    redPacketId?: string;
    /** 用户头像 */
    userAvatar?: string;
    /** 用户ID */
    userId?: number;
    /** 用户昵称 */
    userName?: string;
  };

  type WebParseVO = {
    description?: string;
    favicon?: string;
    title?: string;
  };

  type WordLibrary = {
    category?: string;
    createTime?: string;
    id?: number;
    updateTime?: string;
    word?: string;
    wordType?: string;
  };

  type WordLibraryAddRequest = {
    category?: string;
    word?: string;
    wordType?: string;
  };

  type WordLibraryQueryRequest = {
    category?: string;
    current?: number;
    id?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: string;
    word?: string;
    wordType?: string;
  };

  type WordLibraryUpdateRequest = {
    category?: string;
    id?: number;
    word?: string;
    wordType?: string;
  };
}

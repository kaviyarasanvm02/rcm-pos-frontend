import React, { useState, useContext, useEffect } from "react";
import { Row, Col, Button, Card, CardBody, CardHeader, CardFooter, Spinner, FormGroup, Input } from "reactstrap";
import HeaderCard from "../../../../components/Headers/HeaderCardSmall.js";
import ItemsTable from "./ItemsTable.jsx";
import CustomerInfo from "../../../components/POS/CustomerInfo.js";
import OneTimeCustomerInfo from "../../../components/POS/OneTimeCustomerInfo.js";
import DisplayMessage from "../../../../components/DisplayMessage.js";
import PaymentMethodsModal from "./../Payment/";
import BatchSerialItemsModal from "../../../components/POS/BatchSerialItemsModal/index.js";

import PrintCrystalReport from "../../../components/PrintCrystalReport.js";
import InvoiceReceiptModel from "../../../components/POS/InvoiceReceiptModel.js";
import { UserPermissionsContext } from "../../../../contexts/UserPermissionsContext.js";
import { SalesContext } from "./../context/SalesContext.js";

import { formatDate, getValidNumber } from "../../../../config/util.js";
import { createInvoice } from "../../../../helper/invoice.js";
import {
  getInvoiceSQRequest, getIncomingPaymentRequest, getSalesBatchSelection
} from "../../../common-utils/prepare-payload.util.js";

import {
  getTotalTax as getTotalTaxUtil,
} from "../../../common-utils/calculations.util.js";

import {
  countryCode, statusColors, customerTypes, portalModules,
  DEFAULT_BRANCH_ID, PAYMENT_METHODS, CASH_BANK_ACCOUNT_CODE,
  PRECISION, permissions,
  displayModes,
  TOTAL_AMT_PRECISION
} from "../../../../config/config.js";
import { hasBatchSerialItems } from "../../../common-utils/item.util.js";
import { roundPrice } from "../../../common-utils/calculations.util.js";
import { appPaths } from "../../../../config/config.js";
import { useHistory } from 'react-router-dom';
import CustomModal from "../../../../components/CustomModal";
import { getCustomerInfo } from "../../../../helper/customer.js";

const ItemSummary = () => {
  const { userSessionLog, getLocationBasedDefaultCardCode, checkUserPermission } = useContext(UserPermissionsContext);
  const { customer, salesItems, setItem, resetItems,
    salesHeader, resetSalesHeader, clearSalesHeader, setWarehouseCode,
    invoiceResponse, setInvoiceResponse,
    setSalesCustomer, setSalesItem, setTaxProp,
    isOneTimeCustomer, setIsOneTimeCustomer, isCODCustomer, setIsCODCustomer,
    customerAddress, setCustomerAddress,
    oneTimeCustomerDetails, setOneTimeCustomerDetails, cardPaymentInfo, setCardPaymentInfo,
    getTotalQuantity, getTotalTax, getTaxableAmount, getTotalInvoiceAmount,
    paymentInfo, setPaymentInfo, getParkedTrxCount, handleParkTrx, timYardTransaction, setTimYardTransactions,
    getParkedTrxs, deleteParkedTrx, resumeTrx, setParkedTrans, getPaidAmount, taxProp,
    validateAllItemsStock, warningMsg, setWarningMsg } = useContext(SalesContext);

  // const [warningMsg, setWarningMsg] = useState("");
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [openInvoiceReceiptModal, setInvoiceReceiptModal] = useState(false);
  const [openBatchSerialItemsModal, setOpenBatchSerialItemsModal] = useState(false);
  const [paymentTypes, setPaymentTypes] = useState("");
  const [surcharge, setSurcharge] = useState("");
  const [change, setChange] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentAllowed, setIsPaymentAllowed] = useState(false);
  const [openReasonModal, setOpenReasonModal] = useState(false);
  const [parkReason, setParkReason] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [roundDiff, setRoundDiff] = useState(0);
  const [itemList, setItemList] = useState([]);
  const [timItemList, setTimItemList] = useState([]);
  const history = useHistory();
  const moduleName = portalModules.PAYMENT;

  const closeBatchSerialItemsModal = () => {
    setOpenBatchSerialItemsModal(false);
  }

  /**
   * Set the Items list that contains the Batch, Serial, Bin Allocation info the `context`
   * & open the Payment Modal
   * @param {*} salesItemsWithBatchSerialInfo 
   */
  const handleSaveBatchSerial = (salesItemsWithBatchSerialInfo) => {
    // console.log("*** salesItemsWithBatchSerialInfo: ", salesItemsWithBatchSerialInfo);

    setItem(salesItemsWithBatchSerialInfo); //setSalesItem() adds the value passed as the param as a new item
    closeBatchSerialItemsModal();
    handleOpenPaymentModal();
  }

  const closePaymentModal = async () => {
    const amount = await getPaidAmount();
    setPaidAmount(amount);
    setPaymentInfo({});
    setOpenPaymentModal(false);
  }

  const handleOpenPaymentModal = () => {
    setCardPaymentInfo([]);
    setOpenPaymentModal(true);
    setIsPaymentAllowed(checkUserPermission(moduleName, permissions.CREATE));
  }

  const toggleInvoiceReceiptModal = () => {
    setInvoiceReceiptModal(!openInvoiceReceiptModal);
  }

  const closeInvoiceReceiptModal = () => {
    setInvoiceReceiptModal(false);
    resetInvoiceData();
  }

  const loadDefaultCustomer = () => {
    const getCustomer = async (cardCode) => {
      try {
        const customerInfo = await getCustomerInfo(cardCode);
        if (customerInfo) {
          const { CardName, CreditLimit, AvailableBalance, LicTradNum, Cellular } = customerInfo[0];

          // Add Cust. Name, Credit Limit & Available Bal. to OTC
          setOneTimeCustomerDetails({
            ...oneTimeCustomerDetails, CardName, CreditLimit, AvailableBalance, LicTradNum, Cellular
          });
        }
      }
      catch (err) {
        setWarningMsg(err);
      }
    }

    if (isOneTimeCustomer) {
      const cardCode = getLocationBasedDefaultCardCode(isCODCustomer);
      if (cardCode) {
        getCustomer(cardCode);
      }
    }
  };

  // Resets Customer & Items details in the `context`
  const resetInvoiceData = () => {
    setIsOneTimeCustomer(true);
    setOneTimeCustomerDetails("");
    setIsCODCustomer(false);
    loadDefaultCustomer();
    setSalesCustomer({});
    setCustomerAddress("");
    resetSalesHeader();
    resetItems();
    setPaymentInfo({});
    setPaidAmount(0);
    //setTaxProp("");
    setInvoiceResponse("");
    setWarningMsg("");
    clearSalesHeader();
    // setWarehouseCode("");
    history.push(`${appPaths.CREATE_INVOICE}`);
  }

  const closeReasonModal = () => {
    setOpenReasonModal(false);
  }

  const handleOpenReasonModal = async () => {
    if (validateForm()) {
      // Validate stock before proceeding
      const validationErrors = await validateAllItemsStock();
      if (validationErrors.length > 0) {
        setWarningMsg(validationErrors[0]); // Show first error
        return;
      }

      setWarningMsg("");
      setOpenReasonModal(true);
    }
  }

  const handleParkSubmit = () => {
    setOpenReasonModal(false);
    handleParkTrx();
    setParkReason("");
  }

  const handleChange = (e) => {
    setParkReason(e.target.value);
    setParkedTrans("parkReason", e.target.value);
    setParkedTrans("TotalAmount", getTotalInvoiceAmount(PRECISION));
  }

  const handleOpenPayment = async () => {

    if (validateForm()) {
      // Validate stock before proceeding
      const validationErrors = await validateAllItemsStock();
      if (validationErrors.length > 0) {
        setWarningMsg(validationErrors[0]); // Show first error
        return;
      }

      setWarningMsg("");

      if (hasBatchSerialItems(salesItems)) {
        setOpenBatchSerialItemsModal(true);
        return;
      }
      else {
        handleOpenPaymentModal();
        // await handleSubmit();
      }
    }
  }

  const validateForm = () => {
    if (!isOneTimeCustomer && (!customer || !customer.CardName || !customer.CardCode)) {
      setWarningMsg("Select a Customer to proceed!");
      return false;
    }
    else if (!salesHeader?.SalesPersonCode || salesHeader.SalesPersonCode === -1) {
      setWarningMsg("Select a Sales Employee.");
      return false;
    }
    // else if (!salesHeader?.NumAtCard || salesHeader.NumAtCard === -1) {
    //   setWarningMsg("Enter a Reference#.");
    //   return false;
    // }
    // Address is mandatory for non-OT Customers
    else if (!isOneTimeCustomer && (!customerAddress)) {
      setWarningMsg("Select an Address.")
      return false;
    }
    return true;
  }

  const handleSubmit = async () => {
    setIsLoading(true);
    // Set the CardCode with a default value when the customer is an OTC
    const cardCode = !isOneTimeCustomer ? customer.CardCode
      : getLocationBasedDefaultCardCode(isCODCustomer);

    // Post value with 5 Digits precision for SAP to accept it
    const invoiceAmount = roundPrice(getTotalInvoiceAmount(PRECISION));
    const diffInvoiceAmount = parseFloat(invoiceAmount - getTotalInvoiceAmount(PRECISION)).toFixed(2);

    const request = getInvoiceSQRequest(cardCode, invoiceAmount, salesHeader, salesItems, customerAddress,
      isCODCustomer, oneTimeCustomerDetails, userSessionLog.storeLocation, userSessionLog?.locationDefaults?.Branch, userSessionLog.counterName, userSessionLog.userName);

    console.log("timYardTransaction.length", JSON.stringify(timYardTransaction))
    if (timYardTransaction && Object.keys(timYardTransaction).length > 0) {
      const requestSalesBatch = getSalesBatchSelection(salesItems, timYardTransaction)
      request.salesBatchSelection = requestSalesBatch;
    } else {
      request.salesBatchSelection = [];
    }
    if (diffInvoiceAmount !== 0) {
      //request.invoice.RoundingDiffAmount = diffInvoiceAmount;
      setRoundDiff(diffInvoiceAmount);
    }

    console.log("requestSalesBatch", JSON.stringify(request));
    //return;
    setCustomerName(isOneTimeCustomer ? oneTimeCustomerDetails.U_CODCntName ? oneTimeCustomerDetails.U_CODCntName : oneTimeCustomerDetails.CardName : customer.CardName)
    setCustomerMobile(isOneTimeCustomer ? oneTimeCustomerDetails.U_CODTlePhone ? oneTimeCustomerDetails.U_CODTlePhone : oneTimeCustomerDetails.Cellular : customer.Cellular)

    request.invoice.CompanyCode = process.env.REACT_APP_COMPANY_NAME;
    if (customerAddress.Address2) {
      request.invoice.Address2 = customerAddress.Address2;
    }

    const creditPayment = getValidNumber(paymentInfo?.[PAYMENT_METHODS.Credit]?.amount);
    // NOTE: Credit payment CANNOT be combined with any other payment mode.
    // It doesnt require an `Incoming Payment`
    if (creditPayment > 0) {
      request.invoice.U_PaymentType = PAYMENT_METHODS.Credit;
      setPaymentTypes(PAYMENT_METHODS.Credit);
    }
    // Cash/Cash payments need an `Incoming Payment` payload
    else {
      const paymentAmount = await getPaidAmount();
      const change = roundPrice(getPaidAmount() - getTotalInvoiceAmount(), 2)
      const { ipRequest, paymentTypes } = getIncomingPaymentRequest(cardCode,
        invoiceAmount, paymentAmount, paymentInfo, userSessionLog.storeLocation, userSessionLog.counterName, userSessionLog.userName, userSessionLog?.locationDefaults?.Branch, change, cardPaymentInfo);
      console.log("paymentTypes", JSON.stringify(paymentTypes));
      const filteredPaymentTypes = paymentTypes.filter(p => p.amount > 0);
      request.invoice.U_PaymentType = filteredPaymentTypes.map(p => p.type).join(" + ");
      request.incomingPayment = ipRequest;
      const formatted = filteredPaymentTypes
        .filter(p => p.amount > 0) // Optional: skip zero amounts
        .map(p => `${p.type}: ${roundPrice(p.amount).toFixed(2)}`)
        .join(" + ");
      setPaymentTypes(formatted);
      //setPaymentTypes(paymentTypes.join(" + "));
      const totalSurcharge = cardPaymentInfo.reduce((sum, item) => sum + item.surchargeAmount, 0);
      console.log(totalSurcharge.toFixed(2));
      setSurcharge(totalSurcharge ? totalSurcharge.toFixed(2) : "");
      request.incomingPayment.U_Change = roundPrice(getPaidAmount() - getTotalInvoiceAmount(), 2)
      setChange(request.incomingPayment?.U_Change ? request.incomingPayment.U_Change : "0.00");
    }

    console.log("Create Invoice request: ", JSON.stringify(request));
    // return;

    try {
      //Create Invoice
      const response = await createInvoice(request);
      console.log("Create Invoice Response: ", JSON.stringify(response));
      if (response && response.DocNum) {
        closePaymentModal();
        setInvoiceResponse(response);

        // Items list for POS Invoice Receipt
        setItemList(response?.itemList?.itemsList ? response.itemList.itemsList : []);

        // TIM Items list for POS Invoice Receipt
        setTimItemList(response?.timItemList?.itemsList ? response.timItemList.itemsList : []);

        // Open compact receipt for OTC
        if (customer?.U_CustomerType != customerTypes.B2B && !response.isExist) {
          setInvoiceReceiptModal(true);
        }

        // resetInvoiceData();
      }
    }
    catch (err) {
      if (err.response?.data?.message) {
        setWarningMsg(err.response.data.message);
      }
      else {
        setWarningMsg(err);
      }
    }
    finally {
      setIsLoading(false);
    }
  }

  // useEffect(() => {
  //   // setWarningMsg(warningMsg);
  // }, [warningMsg])

  return (
    <>
      <Card className="shadow">
        <HeaderCard title={"Transaction"} className="border-0" rightContent={
          invoiceResponse?.DocNum ?
            <DisplayMessage
              type={statusColors.SUCCESS}
              iconSize="text-sm"
              message={`Invoice #${invoiceResponse.DocNum} created successfully!`}
            />
            :
            !isOneTimeCustomer
              ? <CustomerInfo
                customer={customer}
                customerAddress={customerAddress}
                setCustomerAddress={setCustomerAddress}
                setWarningMsg={setWarningMsg}
              />
              : <OneTimeCustomerInfo
                isCODCustomer={isCODCustomer}
                oneTimeCustomerDetails={oneTimeCustomerDetails}
              />
        } />
        <CardBody className="p-0">
          <ItemsTable />
        </CardBody>
        <CardFooter className="border-0">
          {isLoading ?
            <>
              <small className="my-2 text-primary">
                Processing... &emsp;
              </small>
              <Spinner color="primary" className="reload-spinner" />
            </>
            : invoiceResponse?.DocEntry ? //&& customer?.U_CustomerType === customerTypes.B2B ?
              // Display this only when Crystal Report Invoice Receipt is shown
              <Row className="text-right">
                <Col>
                  <Button
                    color="primary"
                    onClick={resetInvoiceData}
                    className="btn-square"
                    size="lg"
                  >
                    Start New
                  </Button>
                </Col>
              </Row>
              : !invoiceResponse?.DocEntry && Array.isArray(salesItems) && salesItems.length > 0 &&
              <Row className="text-center">
                <Col>
                  <Button
                    color="danger"
                    onClick={resetInvoiceData}
                    className="btn-square"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </Col>
                <Col>
                  {warningMsg &&
                    <DisplayMessage type={statusColors.WARNING} iconSize="text-sm" message={warningMsg} />}
                </Col>
                <Col className="mr-2">
                  {checkUserPermission(moduleName, permissions.CREATE) ? (
                    <Button
                      color="success"
                      onClick={handleOpenPayment}
                      className="btn-square"
                      size="lg"
                    >
                      Payment
                    </Button>
                  ) : isCODCustomer || !isOneTimeCustomer ? (
                    <Button
                      color="success"
                      onClick={handleOpenPayment}
                      className="btn-square"
                      size="lg"
                    >
                      Payment
                    </Button>
                  )
                    :
                    (
                      <Button
                        color="success"
                        onClick={handleOpenReasonModal}
                        className="btn-square"
                        size="lg"
                      >
                        Park to Payment
                      </Button>
                    )

                  }
                </Col>
              </Row>
          }
        </CardFooter>
      </Card>

      {/* Batch Serial Items Modal */}
      {openBatchSerialItemsModal &&
        <BatchSerialItemsModal
          operation={displayModes.CREATE}
          itemsList={salesItems}
          isOpen={openBatchSerialItemsModal}
          storeLocation={userSessionLog.storeLocation}
          closeModal={closeBatchSerialItemsModal}
          handleSave={handleSaveBatchSerial}
          /**
           * Setting this prop to 'true' will enable QRCode Scanner for users to add 
           * 'Required Quantities' by either scanning or entering Batch or Serial nos.
           * 
           * Set this to 'false' to let users view ALL avilable Batch/Serial nos. & the Bins 
           * under them & enter Qty manually
          */
          showQRCodeScanner={false}
        />
      }

      <PaymentMethodsModal
        isOpen={openPaymentModal}
        closeModal={closePaymentModal}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        warningMsg={warningMsg}
        isPaymentAllowed={isPaymentAllowed}
      />

      <CustomModal
        // modalSize="lg"
        // buttonSize="md"
        isOpen={openReasonModal}
        title={"Park Reason"}
        infoMessage={"Enter the reason for park transanctions"}
        isLoading={false}
        handleSubmit={handleParkSubmit}
        closeModal={closeReasonModal}
      >
        <Card className="shadow px-3 py-2">
          <Row>
            <Col md="12">
              <small className="text-muted">Park Reason</small>
              <FormGroup className="mt-1">
                <Input
                  bsSize="md"
                  type="textarea"
                  className="form-control display-4 text-gray-dark"
                  name="CardReason"
                  value={parkReason}
                  onChange={handleChange}
                  placeholder="Enter Park Reason"
                />
              </FormGroup>
            </Col>
          </Row>
        </Card>
      </CustomModal>

      {invoiceResponse?.DocEntry ?
        customer?.U_CustomerType === customerTypes.B2B ?
          <PrintCrystalReport
            className="ml-3"
            moduleName={portalModules.INVOICE}
            docEntry={invoiceResponse.DocEntry}
            customerType={customerTypes.B2B}
            reportName={process.env.REACT_APP_SALES_INVOICE_CRT}
          // buttonType="button"
          />
          : //customer?.U_CustomerType === customerTypes.B2C || isOneTimeCustomer ?
          <InvoiceReceiptModel
            invoiceNo={invoiceResponse.DocNum}
            qrCode={invoiceResponse.qrCode ? invoiceResponse.qrCode : ""}
            companyName={userSessionLog.locationDefaults.U_LocName}
            companyAddress={userSessionLog.locationDefaults.U_LocAddress}
            companyStore={userSessionLog.locationDefaults.U_Store}
            companyPhone={userSessionLog.locationDefaults.U_Phone}
            companyWebsite={userSessionLog.locationDefaults.U_Website}
            companyEmail={userSessionLog.locationDefaults.U_Email}
            userName={localStorage.getItem("UserName")}
            invoiceCounter={invoiceResponse.InvCount ? invoiceResponse.InvCount : ""}
            sdcInvoiceNo={invoiceResponse.SDCInvNum ? invoiceResponse.SDCInvNum : ""}
            sdcTime={invoiceResponse.SDCTime ? invoiceResponse.SDCTime : ""}
            vehicleNo={invoiceResponse.VehicleNo ? invoiceResponse.VehicleNo : ""}
            isOpen={openInvoiceReceiptModal}
            closeModal={closeInvoiceReceiptModal}
            toggleModal={toggleInvoiceReceiptModal}
            invoiceType="========= FISCAL INVOICE ========="
            salesType="--------------- NORMAL SALES ----------------"
            pickType="PICKING SLIP"
            endOfInvoice="======= END OF FISCAL INVOICE ========"
            callFrom="Invoice"
            posNo={userSessionLog.storeLocation}
            firstDate={formatDate(new Date(), "YYYY-MM-DD HH:mm:ss")}
            secondDate={formatDate(new Date(), "dddd DD/MM/YY hh:mm:ss")}
            user={userSessionLog.userName}
            cashierTIN={userSessionLog.userTIN}
            customerTIN={invoiceResponse.TradeNum ? invoiceResponse.TradeNum : ""}
            customerName={customerName}
            customerMobile={customerMobile}
            referenceNo=""
            terminal={userSessionLog.counterName}
            comments={salesHeader.Comments}
            documentLines={salesItems}
            totalQty={getTotalQuantity()}
            subTotal={getTaxableAmount()}
            tax={getTotalTaxUtil(itemList, taxProp)}
            totalAmount={roundPrice(getTotalInvoiceAmount())}
            timItemList={timItemList}
            roundOff={roundDiff}
            paidAmount={paidAmount}
            paymentType={paymentTypes}
            surcharge={surcharge}
            change={change}
            resetInvoiceData={resetInvoiceData}
            closeWithEsc={true}
          />
        : ""
        // : ""
      }
    </>
  );
};

export default ItemSummary;

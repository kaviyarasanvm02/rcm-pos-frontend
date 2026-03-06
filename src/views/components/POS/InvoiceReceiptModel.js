import { column } from "mathjs";
import React, { useRef } from "react";
import { Card, Row, Col, Button, Modal } from "reactstrap";
import '../../../assets/css/report.css'
import qr_rcm from '../../../assets/img/rcm-qr-code.png'
import { companyNames, companyInfo, companyInfo2, DEFAULT_TAX_PERCENT, rcmCompanyTIN, ajaxCompanyTIN, isGrossPriceEnabled } from "../../../config/config";
import { roundPrice } from "../../common-utils/calculations.util.js";

const InvoiceReceiptModel = (props) => {
  const receiptRef = useRef();

  const closeModal = () => {
    // props.resetInvoiceData();
    props.closeModal();
  }

  const handlePrint = () => {
    // Create a hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    // Get the document of the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Write the content to the iframe
    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <title>Print Receipt</title>
          <style>
            @page {
              size: 80mm auto; /* Set the width for the receipt */
              margin: 20px 2px 2px 10px; /* Set the margins: top, right, bottom, left */
            }
            body { 
              font-family: Arial, sans-serif;
              font-size: 12px;
              margin: 0;
              padding: 0;
              line-height: 1;
            }
            .receipt-content {
              flex-direction: column;
              width: calc(100% - 20px); /* Adjust for the left and right margins */
              padding: 5px 0;
              box-sizing: border-box;
            }
            .thin-hr {
              border-top: 1px solid #000;
              margin: 10px 0;
            }
            .parra {
              margin: 5px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid black;
              padding: 4px;
              text-align: left;
            }
            .text-center {
              text-align: center;
              margin: 0 !important;
              padding: 0 !important;
            }
            .d-flex {
              display: flex;
              justify-content: space-between;
              margin: 0 !important;
              padding: 0 !important;
            }
            .page-break {
              page-break-after: always;
            }
            body, .receipt-content, .parra, h2, h3, h4, h5, table, th, td {
              line-height: 1.1 !important; /* Reduce line height */
            }
          </style>
        </head>
        <body>
          <div class="receipt-content">
            ${receiptRef.current.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                document.body.removeChild(iframe);
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();

    // props.resetInvoiceData();
  };

  const company = process.env.REACT_APP_COMPANY_NAME === companyNames.AJAX
    ? companyInfo : companyInfo2;

  const companyTIN = process.env.REACT_APP_COMPANY_NAME === companyNames.AJAX
    ? ajaxCompanyTIN : rcmCompanyTIN;

  return (
    <>
      <Modal
        autoFocus={props.disableAutoFocus ? false : true}
        size={props.modalSize}
        className="modal-dialog-centered modal-large"
        contentClassName="neo-modal"
        isOpen={props.isOpen}
        closeModal={closeModal}
        toggle={props.toggleModal}
        backdrop={"static"}
        keyboard={props.closeWithEsc}
      >
        <div className="header mt-3">

          <div className="d-flex justify-content-center"> <Button color="primary" onClick={handlePrint}>
            Print
          </Button></div>
          <Button className="close-btn" onClick={closeModal}>
            <i class="fas fa-times-circle"></i>
          </Button>
        </div>
        <div className="modal-body">
          <Card className="border-0">
            <Row>
              <Col>
                {/* Display the receipt details here */}
                <div ref={receiptRef} >
                  <div className="receipt-content" style={{ flexDirection: column, }}>
                    <div className="d-flex justify-content-center">
                      {process.env.REACT_APP_COMPANY_NAME === companyNames.AJAX ?
                        <img className="" alt="store" width="380px" src={require("assets/img/brand/store.jpeg")} />
                        :
                        <img className="" alt="store" width="380px" src={require("assets/img/brand2/store.jpeg")} />
                      }
                    </div>
                    <h2 className="text-center">{props.companyName}</h2>
                    <h3 className="text-center">{props.companyAddress}</h3>
                    <h3 className="text-center mb-0">Store: <span>{props.companyStore}</span></h3>
                    <h3 className="text-center mb-0">Phone: <span>{props.companyPhone}</span></h3>
                    <h3 className="text-center mb-0">Website: <span>{props.companyWebsite}</span></h3>
                    <h3 className="text-center mb-0">Email: <span>{company.companyEmail}</span></h3>
                    <h3 className="text-center"><strong>{props.invoiceType}</strong></h3>
                    <h4 className="text-center">TIN # : <span>{companyTIN}</span></h4>
                    <h4 className="text-center">POS No : <span>{props.posNo}</span></h4>
                    <h4 className="text-center">POS Time : <span>{props.firstDate}</span></h4>
                    {/* <h2 className="text-center">{props.salesType}</h2> */}
                    <h4 className="text-center">{props.secondDate}</h4>
                    <div className="thin-hr" />
                    <p className="parra"><b>Cashier/ Served By :</b> <span className="mx-4"> <b>{props.userName}</b></span></p>
                    <p className="parra"><b>Cashier TIN# :</b>  <span className="mx-4"><b>{props.cashierTIN}</b></span></p>
                    <p className="parra"><b>Customer# :</b> <span className="mx-4"><b> {props.customerTIN}</b></span></p>
                    <p className="parra"><b>Customer Name# :</b> <span className="mx-4"><b> {props.customerName}</b></span></p>
                    <p className="parra"><b>Customer Mobile# :</b> <span className="mx-4"><b> {props.customerMobile}</b></span></p>
                    <p className="parra"><b>Reference No : </b> <span className="mx-4"><b>{props.referenceNo}</b></span></p>
                    <p className="parra"><b>Invoice No : </b> <span className="mx-4"><b>{props.invoiceNo}</b></span></p>
                    {/* <p className="parra"><b>Remarks : </b> <span className="mx-4"><b>{props.comments}</b></span></p> */}
                    <h2 className="text-center">{props.salesType}</h2>
                    <div className="thin-hr" />
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ border: '1px solid black', padding: '4px' }}>Item & Description</th>
                          <th style={{ border: '1px solid black', padding: '4px' }}>Qty</th>
                          <th style={{ border: '1px solid black', padding: '4px' }}>Price</th>
                          <th style={{ border: '1px solid black', padding: '4px' }}>UOM</th>
                          <th style={{ border: '1px solid black', padding: '4px' }}>Ex. Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {props.documentLines?.map((line, index) => (
                          <>
                            <tr key={index}>
                              <td style={{ border: '0px solid black', padding: '4px', textAlign: 'left' }}><b>{line.ItemCode}</b> | <b> {"WH: "}  </b> {line.WhsCode} <br /> <span className="item-name">{line.ItemName?.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</span></td>
                              <td style={{ border: '0px solid black', padding: '4px' }}>{parseFloat(line.Quantity)}</td>
                              <td style={{ border: '0px solid black', padding: '4px' }}>{parseFloat(line.NetUnitPrice)?.toFixed(2)}</td>
                              <td style={{ border: '0px solid black', padding: '4px' }}>{line.UomCode ?? ""}</td>
                              <td style={{ border: '0px solid black', padding: '4px' }}>{parseFloat(props.callFrom === "ViewInvoice" ? roundPrice(line.NetUnitPrice * line.Quantity) : isGrossPriceEnabled ? line.TotalPriceWithTax * line.Quantity : line.TotalPriceWithTax)?.toFixed(2)}</td>
                            </tr>
                            {line.Pcs > 0 &&
                              <tr>
                                <td style={{ border: '0px solid black', padding: '4px' }}>No of Pcs: </td>
                                <td style={{ border: '0px solid black', padding: '4px' }}><b>{line.Pcs}</b></td>
                              </tr>
                            }
                          </>
                        ))}
                      </tbody>
                    </table>
                    <div className="thin-hr" />
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Sub Total ({props.totalQty}) Items: </h4><h4 className="lh-080">{parseFloat(props.subTotal)?.toFixed(2)}</h4></div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">VAT (Component):</h4> <h4 className=" lh-080">{parseFloat(props.tax)?.toFixed(2)}</h4></div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Rounded Off: </h4><h4 className=" lh-080">{parseFloat(props.roundOff)?.toFixed(2)}</h4></div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Total:</h4> <h4 className=" lh-080">{parseFloat(props.totalAmount)?.toFixed(2)}</h4> </div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">EFTPOS Charge: </h4> <h4 className=" lh-080">{props.surcharge ? parseFloat(props.surcharge)?.toFixed(2) : "0.00"}</h4></div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Payment Method:</h4> <h4 className=" lh-080">{props.paymentType}</h4></div>
                    <div className="thin-hr" />
                    {/* <div className="d-flex justify-content-between"><h4 className=" lh-080">Amount Tendered:</h4> <h4 className=" lh-080">{props.surcharge ? parseFloat(props.totalAmount + props.surcharge)?.toFixed(2) : parseFloat(props.totalAmount)?.toFixed(2)}</h4></div> */}
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Amount Tendered:</h4> <h4 className=" lh-080">{props.paidAmount ? parseFloat(props.paidAmount)?.toFixed(2) : "0.00"}</h4></div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Change:</h4><h4 className=" lh-080">{parseFloat(props.change)?.toFixed(2)}</h4></div>
                    <div className="thin-hr" />
                    <h4 className="text-center 1h-100">VAT Specification</h4>
                    <div className="d-flex justify-content-center align-items-center vat-table">
                      <table>
                        <thead>
                          <th className="px-2 ">Label</th>
                          <th className="px-2">Name</th>
                          <th className="px-2">Rate</th>
                          <th className="px-2">Tax</th>
                          <th className="px-2">Total Tax</th>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ border: '0px solid black' }} className="px-2">G</td>
                            <td style={{ border: '0px solid black' }} className="px-2">VAT</td>
                            <td style={{ border: '0px solid black' }} className="px-2">{DEFAULT_TAX_PERCENT}%</td>
                            <td style={{ border: '0px solid black' }} className="px-2">{parseFloat(props.tax)?.toFixed(2)}</td>
                            <td style={{ border: '0px solid black' }} className="px-2">{parseFloat(props.tax)?.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="borders">
                      {/* <div className=" dooted-border1 my-2"></div> */}
                      <br />
                    </div>
                    <div className="d-flex justify-content-around"><h4 className=" lh-080">Total Tax</h4><h4 className=" lh-080"> {parseFloat(props.tax)?.toFixed(2)}</h4></div>

                    <div className="thin-hr" />
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Cash Amount:</h4><h4 className=" lh-080">{parseFloat(props.totalAmount)?.toFixed(2)}</h4></div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Other Details:</h4><h4 className=" lh-080"></h4></div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Vehicle No: {props.vehicleNo}</h4><h4 className=" lh-080"></h4></div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">VAT System Checked By</h4><h4 className=" lh-080"></h4></div>

                    <div className="thin-hr" />
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Remarks : </h4><h4 className="lh-080"><b>{props.comments}</b></h4></div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Terminal : </h4><h4 className="lh-080"><b>{props.terminal}</b></h4></div>
                    <div className="d-flex justify-content-between"><h4><b><u>TERMS & CONDITIONS</u></b></h4></div>
                    <div className="d-flex justify-content-between"><h5 className=" lh-080"><i>You must choose carefully. The laws as established by the Fijian Competition and Consumer Commission Act 2010 and the Sale of Goods Act applies in respect of returns, refunds and/or replacement.  In all other circumstances, we reserve the right to refuse a return, refund or replacement. If you wish to return or replace goods or seek a refund you must: - </i></h5></div>
                    <div className="d-flex justify-content-between"><h5 className=" lh-080"><i>1. Provide proof of Purchase.</i></h5></div>
                    <div className="d-flex justify-content-between"><h5 className=" lh-080"><i>2. Bring the goods undamaged and in original packaging.</i></h5></div>
                    <div className="d-flex justify-content-between"><h5 className=" lh-080"><i>3. Make your claim within 7 (Seven) days from the date of Purchase.</i></h5></div>
                    <div className="d-flex justify-content-between"><h5 className=" lh-080"><i>4. If your right to return, refund or replacement does not arise because of a breach of any guarantees provided under the Commerce Commission Act, then we may charge a handling fee not exceeding 10% of the value of goods.</i></h5></div>
                    <div className="d-flex justify-content-between"><h5 className=" lh-080"><i><b>Important: </b>All purchases are subject to our Terms and Conditions of Sale. Scan the QR code with your phone to read these terms now or visit our website https://rcmanubhai.com.fj/terms-conditions/. By proceeding to payment, you acknowledge that you had the opportunity to review and accept the terms and conditions.</i></h5></div>
                    <div className="d-flex justify-content-center">
                      { //process.env.REACT_APP_COMPANY_NAME === companyNames.RCM ? 
                        <img src={qr_rcm} alt="QR Code" width="80" height="80" style={{ objectFit: 'contain' }} />
                        //: null
                      }
                    </div>
                    <h2 className="text-center mb-0"><b>THANK YOU</b></h2>
                    <h4 className="text-center"><b>For Shopping At R.C. Manubhai & Co. Pte Ltd</b></h4>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">SDC Time : {props.sdcTime}</h4> </div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">SDC Invoice No : {props.sdcInvoiceNo}</h4> </div>
                    <div className="d-flex justify-content-between"><h4 className=" lh-080">Invoice Counter : {props.invoiceCounter}</h4> </div>
                    <div className="d-flex justify-content-center">
                      {props.qrCode ?
                        <img src={props.qrCode} alt="QR Code" />
                        : null
                      }
                    </div>
                    <h2 className="text-center">{props.endOfInvoice}</h2>
                  </div>
                  <div className="page-break"></div>
                  {
                    props?.timItemList?.length > 0 &&

                    <div className="receipt-content" style={{ flexDirection: column, }}>
                      <div className="d-flex justify-content-center">
                        {process.env.REACT_APP_COMPANY_NAME === companyNames.AJAX ?
                          <img className="" alt="store" width="380px" src={require("assets/img/brand/store.jpeg")} />
                          :
                          <img className="" alt="store" width="380px" src={require("assets/img/brand2/store.jpeg")} />
                        }
                      </div>
                      <h2 className="text-center">{props.companyName}</h2>
                      <h3 className="text-center">{props.companyAddress}</h3>
                      <h3 className="text-center mb-0">Phone: <span>{props.companyPhone}</span></h3>
                      <h4 className="text-center">TIN # : <span>{companyTIN}</span></h4>
                      <h3 className="text-center"><strong>======================================</strong></h3>
                      <h3 className="text-center"><strong>{props.pickType}</strong></h3>
                      <div className="thin-hr" />
                      <p className="parra"><b>Invoice No : </b> <span className="mx-4"><b>{props.invoiceNo}</b></span></p>
                      <p className="parra"><b>Date :</b> <span className="mx-4"> <b>{props.firstDate}</b></span></p>
                      <p className="parra"><b>Customer# :</b> <span className="mx-4"><b> {props.customerName}</b></span></p>
                      <p className="parra"><b>Pickup :</b> <span className="mx-4"><b> {props.timItemList[0].WhsName}</b></span></p>
                      <div className="thin-hr" />
                      <div className="thin-hr" />
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ border: '1px solid black', padding: '4px' }}>Item & Description</th>
                            <th style={{ border: '1px solid black', padding: '4px' }}>Batch</th>
                            <th style={{ border: '1px solid black', padding: '4px' }}>Qty</th>
                            <th style={{ border: '1px solid black', padding: '4px' }}>Total CUMT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {props.timItemList?.map((line, index) => (
                            <>
                              <tr key={index}>
                                <td style={{ border: '0px solid black', padding: '4px', textAlign: 'left' }}><b>{line.ItemCode}</b> | <b> {"WH: "}  </b> {line.WhsCode} <br /> <span className="item-name">{line.Description?.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} <br /> {line.U_Length} * {line.U_Width} <br /> {line.U_Height}</span></td>
                                <td style={{ border: '0px solid black', padding: '4px' }}>{line.BatchNum}</td>
                                <td style={{ border: '0px solid black', padding: '4px' }}>{line.NoofPieces ? parseFloat(line.NoofPieces)?.toFixed(5) : "0.00"}</td>
                                <td style={{ border: '0px solid black', padding: '4px' }}>{parseFloat(line.SelectedQty)?.toFixed(5)}</td>
                              </tr>
                            </>
                          ))}
                        </tbody>
                      </table>
                      <div className="thin-hr" />
                      <p className="parra"><b>Printed At :</b> <span className="mx-4"> <b>{props.secondDate}</b></span></p>
                      <p className="parra"><b>Served By :</b> <span className="mx-4"> <b>{props.userName}</b></span></p>
                      <div className="thin-hr" />
                      <h2 className="text-center"><b> THANK YOU FOR YOUR ORDER </b></h2>
                      <div className="thin-hr" />
                    </div>
                  }
                </div>
              </Col>
            </Row>
          </Card>
        </div>
        <div className="thin-hr" />

        <div className="modal-footer">

        </div>
      </Modal>
    </>
  );
};

export default InvoiceReceiptModel;
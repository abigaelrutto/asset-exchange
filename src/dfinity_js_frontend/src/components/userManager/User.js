import React from "react";
import PropTypes from "prop-types";
import { Card, Col, Badge, Stack } from "react-bootstrap";
import UpdateUser from "./UpdateUser";
import { Principal } from "@dfinity/principal";
import UpdateAsset from "../assetManager/UpdateAsset";

const User = ({ user, update, updateAsset }) => {
  const { id, name, email, phone, principal, assets } = user;

  const userPrincipal = window.auth.principalText;
  const isOwner = Principal.from(principal).toText() === userPrincipal;

  return (
    <Col key={id}>
      <Card className=" h-100">
        <Card.Body className="d-flex  flex-column text-start">
          <Stack className="d-flex justify-content-between">
            <Card.Title>Name: {name}</Card.Title>
            {isOwner && <UpdateUser user={user} save={update} />}
          </Stack>
          <Card.Text>Id: {id}</Card.Text>
          <Card.Text className="flex-grow-1 ">Email: {email}</Card.Text>
          <Card.Text className="flex-grow-1 ">Phone: {phone}</Card.Text>
          <Card.Text className="flex-grow-1 ">
            Principal: {Principal.from(principal).toText()}
          </Card.Text>
          <h3>User assets</h3>
          {assets.map((asset, index) => {
            const intPricePerUnit = Number(
              asset.pricePerUnit / BigInt(10 ** 8)
            );

            return (
              <Card key={index} className="flex-grow-1 w-40">
                <Card.Header>
                  <Stack direction="horizontal" gap={2}>
                    <Badge bg="secondary" className="ms-auto">
                      price: {intPricePerUnit} ICP
                    </Badge>
                    <Badge bg="secondary" className="ms-auto">
                      {Number(asset.availableUnits)} Units
                    </Badge>
                    {isOwner && (
                      <UpdateAsset asset={asset} save={updateAsset} />
                    )}
                  </Stack>
                </Card.Header>
                <Card.Body className="d-flex  flex-column">
                  <Card.Title>{asset.name}</Card.Title>
                  <Card.Text className="flex-grow-1 ">
                    description: {asset.description}
                  </Card.Text>
                  <Card.Text className="flex-grow-1 ">
                    Type: {asset.assetType}
                  </Card.Text>
                  <Card.Text className="flex-grow-1 ">
                    date: {asset.createdAt}
                  </Card.Text>
                  <Card.Text className="flex-grow-1 ">
                    isTokenized: {asset.isTokenized}
                  </Card.Text>
                  <Card.Text className="flex-grow-1">
                    updatedAt: {asset.updatedAt}
                  </Card.Text>
                </Card.Body>
              </Card>
            );
          })}
        </Card.Body>
      </Card>
    </Col>
  );
};

User.propTypes = {
  user: PropTypes.instanceOf(Object).isRequired,
};

export default User;
